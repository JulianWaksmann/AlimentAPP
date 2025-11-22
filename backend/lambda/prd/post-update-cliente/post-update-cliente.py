import json
import logging
import os
import ssl
from typing import Any, Dict, Optional
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()

class ValidationError(Exception):
    pass


# --- Conexión ---
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


def update_cliente(cur, payload: Dict[str, Any]) -> Dict[str, Any]:
    if "id_cliente" not in payload:
        raise ValidationError("Debe proporcionar id_cliente.")

    id_cliente = int(payload["id_cliente"])

    # Verificar existencia del cliente
    cliente = run_query(cur, f"SELECT * FROM {ENV}.cliente WHERE id = %s", (id_cliente,))
    if not cliente:
        raise ValidationError(f"No existe el cliente con id {id_cliente}.")

    # Campos permitidos para actualizar
    campos_actualizables = [
        "razon_social",
        "email",
        "cuil",
        "nombre_contacto",
        "apellido_contacto",
        "telefono",
        "activo",
    ]

    updates = []
    params = []

    for campo in campos_actualizables:
        if campo in payload:
            updates.append(f"{campo} = %s")
            params.append(payload[campo])

    if not updates:
        raise ValidationError("No se enviaron campos válidos para actualizar.")

    params.append(id_cliente)

    sql = f"UPDATE {ENV}.cliente SET {', '.join(updates)} WHERE id = %s"
    run_command(cur, sql, tuple(params))

    actualizado = run_query(cur, f"SELECT * FROM {ENV}.cliente WHERE id = %s", (id_cliente,))
    return actualizado[0]


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
        conn = get_connection()
        cur = conn.cursor()

        result = update_cliente(cur, payload)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Cliente actualizado correctamente"
            }),
        }

    except ValidationError as e:
        if conn:
            conn.rollback()
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": str(e)})}

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)})
        }

    finally:
        if conn:
            conn.close()