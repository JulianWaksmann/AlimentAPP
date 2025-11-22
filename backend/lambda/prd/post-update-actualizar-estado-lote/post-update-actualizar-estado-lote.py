import json
import logging
import os
import ssl
from datetime import datetime
from typing import Any, Dict
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG = None  # cache SSM

LAMBDA_ASIGNAR_MP = os.getenv(
    "LAMBDA_POST_ASIGNAR_MATERIA_PRIMA",
    "asignacion-lote-materia-prima-orden-produccion",
)


class ValidationError(Exception):
    """Error de validación."""


def get_db_parameters() -> Dict[str, Any]:
    """Lee parámetros de RDS desde SSM (cacheado)."""
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG

    param_names = [
        "/alimentapp/db/host",
        "/alimentapp/db/password",
        "/alimentapp/db/port",
        "/alimentapp/db/username",
    ]
    resp = ssm_client.get_parameters(Names=param_names, WithDecryption=True)
    if len(resp["Parameters"]) != len(param_names):
        missing = set(param_names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Parámetros faltantes en SSM: {', '.join(missing)}")

    data = {p["Name"].split("/")[-1]: p["Value"] for p in resp["Parameters"]}
    DB_CONFIG = {
        "host": data["host"],
        "port": int(data.get("port", "5432")),
        "user": data["username"],
        "password": data["password"],
        "database": os.getenv("DB_NAME", "postgres"),
    }
    return DB_CONFIG


def get_connection():
    """Abre conexión pg8000 + SSL."""
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=ssl.create_default_context(),
        timeout=10,
    )


def run_query(cur, sql: str, params: tuple = None):
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: tuple = None):
    """INSERT/UPDATE/DELETE; no retorna filas."""
    cur.execute(sql, params or ())


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    payload = json.loads(event.get("body", "{}"))
    required = ["id_lote", "nuevo_estado"]
    missing = [k for k in required if not payload.get(k)]
    if missing:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": f"Faltan campos: {', '.join(missing)}"})
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        id_lote = int(payload["id_lote"])
        nuevo_estado = payload["nuevo_estado"]
        fecha_ingreso = datetime.now()
        fecha_vencimiento = payload.get("fecha_vencimiento")
        observaciones = payload.get("observaciones")
        codigo_lote = payload.get("codigo_lote")

        estados_validos = {"en_cuarentena", "disponible", "rechazado"}
        if nuevo_estado not in estados_validos:
            raise ValidationError(f"Estado inválido. Debe ser uno de: {', '.join(estados_validos)}")

        exists = run_query(cur, f"SELECT 1 FROM {ENV}.lote_materia_prima WHERE id = %s", (id_lote,))
        if not exists:
            raise ValidationError("El lote indicado no existe")

        # Actualizaciones principales
        run_command(cur, f"""
            UPDATE {ENV}.lote_materia_prima
            SET fecha_ingreso = %s, estado = %s
            WHERE id = %s
        """, (fecha_ingreso, nuevo_estado, id_lote))

        if fecha_vencimiento:
            run_command(cur, f"""
                UPDATE {ENV}.lote_materia_prima
                SET fecha_vencimiento = %s
                WHERE id = %s
            """, (fecha_vencimiento, id_lote))

        if observaciones:
            run_command(cur, f"""
                UPDATE {ENV}.lote_materia_prima
                SET observaciones = %s
                WHERE id = %s
            """, (observaciones, id_lote))

        if codigo_lote:
            run_command(cur, f"""
                UPDATE {ENV}.lote_materia_prima
                SET codigo_lote = %s
                WHERE id = %s
            """, (codigo_lote, id_lote))

        conn.commit()

        # 🔹 INVOCAR LAMBDA DE ASIGNACIÓN AUTOMÁTICA
        asignacion_resultado = None
        if nuevo_estado == "disponible":
            try:
                logger.info("Invocando lambda de asignación de materia prima: %s", LAMBDA_ASIGNAR_MP)
                payload_asignacion = json.dumps({}).encode("utf-8")
                response = lambda_client.invoke(
                    FunctionName=LAMBDA_ASIGNAR_MP,
                    InvocationType="Event",  # asincrónica, no bloquea
                    Payload=payload_asignacion,
                )
                asignacion_resultado = {"status_code": response.get("StatusCode")}
            except Exception as exc:
                logger.exception("Fallo al invocar la lambda de asignación de materia prima")
                asignacion_resultado = {"error": str(exc)}

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "message": f"Estado del lote {id_lote} actualizado a {nuevo_estado}",
                "asignacion_materia_prima": asignacion_resultado
            }),
        }

    except ValidationError as e:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error general en actualización de lote")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }

    finally:
        if conn:
            conn.close()
