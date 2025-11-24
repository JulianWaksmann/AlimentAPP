import json
import logging
import os
import ssl
from typing import Any, Dict, List, Optional

import boto3
import pg8000

# --- Configuración base ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación para payloads."""


# --- Conexión a la base ---
def get_db_parameters() -> Dict[str, Any]:
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
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=ssl_context,
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
    cur.execute(sql, params or ())


# --- Lógica principal ---
def crear_tanda_envios(cur, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    required = ["id_vehiculo", "ordenes_venta"]
    missing = [k for k in required if k not in payload]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    id_vehiculo = int(payload["id_vehiculo"])
    ordenes_venta = payload["ordenes_venta"]

    if not isinstance(ordenes_venta, list) or not ordenes_venta:
        raise ValidationError("ordenes_venta debe ser una lista con al menos un elemento.")

    # Validar vehículo
    vehiculo = run_query(cur, f"SELECT id FROM {ENV}.vehiculo WHERE id = %s", (id_vehiculo,))
    if not vehiculo:
        raise ValidationError(f"El vehículo con id={id_vehiculo} no existe.")

    envios_creados = []

    for item in ordenes_venta:
        id_orden_venta = item.get("id_orden_venta") or item.get("id_ordenes_venta")
        if not id_orden_venta:
            raise ValidationError("Cada elemento debe incluir 'id_orden_venta'.")

        id_orden_venta = int(id_orden_venta)

        # Validar orden de venta
        orden = run_query(
            cur,
            f"SELECT id, con_envio FROM {ENV}.orden_venta WHERE id = %s",
            (id_orden_venta,),
        )
        if not orden:
            raise ValidationError(f"La orden de venta {id_orden_venta} no existe.")
        if not orden[0]["con_envio"]:
            raise ValidationError(f"La orden {id_orden_venta} no tiene envío habilitado.")

        # Crear registro en la tabla envio
        run_command(
            cur,
            f"""
            INSERT INTO {ENV}.envio
                (id_orden_venta, id_vehiculo, estado, porcentaje_entrega, created_at)
            VALUES (%s, %s, 'pendiente', 100.00, NOW())
            """,
            (id_orden_venta, id_vehiculo),
        )

        envio_id = run_query(cur, "SELECT LASTVAL() AS id")[0]["id"]

        # 🔁 Actualizar el estado de la orden de venta
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_venta
            SET estado = 'asignada_para_envio'
            WHERE id = %s
            """,
            (id_orden_venta,),
        )

        envios_creados.append({
            "id_envio": envio_id,
            "id_orden_venta": id_orden_venta,
            "id_vehiculo": id_vehiculo,
            "nuevo_estado": "asignada_para_envio"
        })

    return envios_creados


# --- Handler principal ---
def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        resultado = crear_tanda_envios(cur, payload)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Tanda de envíos creada correctamente",
                "vehiculo": payload["id_vehiculo"],
                "envios_creados": resultado
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
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
