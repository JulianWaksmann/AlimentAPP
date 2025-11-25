import json
import logging
import os
import ssl
from typing import Any, Dict, Optional, List

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
SSL_CONTEXT = ssl.create_default_context()


# --------------------------
# ERRORES
# --------------------------
class ValidationError(Exception):
    pass


# --------------------------
# CONEXIÓN A BD
# --------------------------
def get_db_parameters() -> Dict[str, Any]:
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG

    names = [
        "/alimentapp/db/host",
        "/alimentapp/db/password",
        "/alimentapp/db/port",
        "/alimentapp/db/username",
    ]

    resp = ssm_client.get_parameters(Names=names, WithDecryption=True)

    if len(resp["Parameters"]) != len(names):
        missing = set(names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Faltan parámetros en SSM: {', '.join(missing)}")

    data = {p["Name"].split("/")[-1]: p["Value"] for p in resp["Parameters"]}

    DB_CONFIG = {
        "host": data["host"],
        "port": int(data["port"]),
        "user": data["username"],
        "password": data["password"],
        "database": os.getenv("DB_NAME", "postgres")
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
        ssl_context=SSL_CONTEXT,
        timeout=10,
    )


def run_query(cur, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
    cur.execute(sql, params or ())
    rows = cur.fetchall()

    if not rows:
        return []

    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, r)) for r in rows]


# --------------------------
# LÓGICA PRINCIPAL
# --------------------------
def obtener_todos_los_vehiculos(cur) -> List[Dict[str, Any]]:

    sql = f"""
    SELECT 
        id,
        empresa,
        nombre_conductor,
        apellido_conductor,
        dni_conductor,
        tipo_unidad,
        patente,
        modelo,
        capacidad_kg,
        color,
        disponible
    FROM {ENV}.vehiculo
    ORDER BY id ASC
    """

    return run_query(cur, sql)


# --------------------------
# HANDLER
# --------------------------
def lambda_handler(event, context):

    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    conn = None

    try:
        conn = get_connection()
        cur = conn.cursor()

        data = obtener_todos_los_vehiculos(cur)

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"vehiculos": data}, default=str)
        }

    except Exception as exc:
        logger.exception("Error inesperado en get-all-vehiculos")
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": "Error interno", "detail": str(exc)})
        }
    finally:
        if conn:
            conn.close()
