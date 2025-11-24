import json
import logging
import os
import ssl
import random
from datetime import date, timedelta, datetime

from typing import Any, Dict, List

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
    """Error de validación para orden de venta."""


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
    """Abre conexión pg8000 + SSL con credenciales de SSM."""
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


def run_query(cur, sql: str):
    """SELECT; devuelve filas como dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str):
    """INSERT/UPDATE/DELETE; no retorna filas."""
    cur.execute(sql)


def generar_numero_lote() -> str:
    """Genera un número de lote tipo LT-AB12345Z."""
    letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    parte_letras = "".join(random.choices(letras, k=2))
    parte_num = "".join(random.choices("0123456789", k=5))
    sufijo = random.choice(letras)
    return f"LT-{parte_letras}{parte_num}{sufijo}"


def generar_fecha_vencimiento() -> date:
    """Genera fecha de vencimiento aleatoria entre 6 y 18 meses desde hoy."""
    meses_random = random.randint(6, 18)
    return date.today() + timedelta(days=meses_random * 30)


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": ""
        }

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 🔹 1. Obtener los lotes en estado 'en_espera' junto con el id_materia_prima
        sql_select = f"""
            SELECT lm.id, lm.id_materia_prima, mp.expirabile
            FROM {ENV}.lote_materia_prima lm
            JOIN {ENV}.materia_prima mp ON mp.id = lm.id_materia_prima
            WHERE lm.estado = 'pedido_generado';
        """
        lotes = run_query(cur, sql_select)

        if not lotes:
            logger.info("No hay lotes en espera.")
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"message": "No hay lotes pendientes."}),
            }

        lista_ids_materia_prima_aceptadas = []
        fecha_ingreso = datetime.now()

        # 🔹 2. Actualizar cada lote con datos random
        for lote in lotes:
            id_lote = lote["id"]
            id_materia_prima = lote["id_materia_prima"]
            es_expirable = lote["expirabile"]

            # --- generar código de lote único ---
            while True:
                codigo_lote = generar_numero_lote()
                check_sql = f"SELECT 1 FROM {ENV}.lote_materia_prima WHERE codigo_lote = '{codigo_lote}' LIMIT 1;"
                existe = run_query(cur, check_sql)
                if not existe:
                    break  # único, continuar generando lote

            # --- generar fecha si corresponde ---
            fecha_vencimiento = f"'{generar_fecha_vencimiento()}'" if es_expirable else "NULL"

            estado_nuevo = "disponible"

            sql_update = f"""
                UPDATE {ENV}.lote_materia_prima
                SET
                    codigo_lote = '{codigo_lote}',
                    fecha_ingreso = '{fecha_ingreso}',
                    fecha_vencimiento = {fecha_vencimiento},
                    estado = '{estado_nuevo}'
                WHERE id = {id_lote};
            """
            run_command(cur, sql_update)
            lista_ids_materia_prima_aceptadas.append(id_lote)

        conn.commit()

        # 🔹 3. Invocar lambda de asignación automática
        asignacion_resultado = None
        try:
            payload_asignacion = json.dumps({"lotes": lista_ids_materia_prima_aceptadas}).encode("utf-8")
            response = lambda_client.invoke(
                FunctionName=LAMBDA_ASIGNAR_MP,
                InvocationType="Event",
                Payload=payload_asignacion,
            )
            asignacion_resultado = {"status_code": response.get("StatusCode")}
        except Exception as exc:
            logger.exception("Fallo al invocar la lambda de asignación de materia prima")
            asignacion_resultado = {"error": str(exc)}

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "materia_prima_aceptadas": lista_ids_materia_prima_aceptadas
            }, default=str),
        }

    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
