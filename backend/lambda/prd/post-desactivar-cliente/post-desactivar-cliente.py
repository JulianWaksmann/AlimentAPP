import json
import logging
import os
import ssl
import boto3
import pg8000
from typing import Any, Dict, Optional

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación para el payload."""


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
    """Abre conexión a la base de datos."""
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
    """Ejecuta SELECT y devuelve resultados como dicts."""
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: tuple = None):
    """Ejecuta INSERT/UPDATE/DELETE."""
    cur.execute(sql, params or ())


def desactivar_cliente(cur, id_cliente: int):
    """Desactiva un cliente si está activo."""
    cliente = run_query(cur, f"SELECT id, activo FROM {ENV}.cliente WHERE id = %s", (id_cliente,))
    if not cliente:
        raise ValidationError(f"Cliente con id {id_cliente} no existe.")
    if not cliente[0]["activo"]:
        raise ValidationError(f"El cliente {id_cliente} ya está inactivo.")

    run_command(cur, f"UPDATE {ENV}.cliente SET activo = FALSE WHERE id = %s", (id_cliente,))
    return {"id_cliente": id_cliente, "estado": "inactivo"}


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None
    try:
        if not payload or "id_cliente" not in payload:
            raise ValidationError("Debe proporcionar el id_cliente en el body.")

        id_cliente = int(payload["id_cliente"])
        conn = get_connection()
        cur = conn.cursor()

        result = desactivar_cliente(cur, id_cliente)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"message": "Cliente desactivado correctamente", "data": result}),
        }

    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": str(exc)}),
        }

    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }

    finally:
        if conn:
            conn.close()
