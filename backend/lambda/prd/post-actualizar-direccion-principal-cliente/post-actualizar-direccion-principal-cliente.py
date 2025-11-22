import json
import logging
import os
import ssl
import boto3
import pg8000
from typing import Any, Dict

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None

# --- Funciones base ---
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
    cur.execute(sql, params or ())


# --- Lambda principal ---
def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)
    
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    required = ["id_cliente", "id_direccion"]
    missing = [k for k in required if k not in payload]
    if missing:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": f"Faltan campos obligatorios: {', '.join(missing)}"}),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        id_cliente = int(payload["id_cliente"])
        id_direccion = int(payload["id_direccion"])

        # Validar existencia del cliente
        cliente = run_query(cur, f"SELECT id FROM {ENV}.cliente WHERE id = %s", (id_cliente,))
        if not cliente:
            raise ValueError("El cliente especificado no existe.")

        # Validar que la dirección pertenezca al cliente
        direccion = run_query(cur, f"""
            SELECT id FROM {ENV}.direccion
            WHERE id = %s AND id_cliente = %s
        """, (id_direccion, id_cliente))
        if not direccion:
            raise ValueError("La dirección no pertenece al cliente indicado.")

        # Marcar todas las direcciones del cliente como no principales
        run_command(cur, f"""
            UPDATE {ENV}.direccion
            SET es_principal = FALSE
            WHERE id_cliente = %s
        """, (id_cliente,))

        # Marcar la nueva dirección como principal
        run_command(cur, f"""
            UPDATE {ENV}.direccion
            SET es_principal = TRUE
            WHERE id = %s
        """, (id_direccion,))

        # Actualizar el cliente
        run_command(cur, f"""
            UPDATE {ENV}.cliente
            SET id_direccion_principal = %s
            WHERE id = %s
        """, (id_direccion, id_cliente))

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Dirección principal actualizada correctamente",
                "id_cliente": id_cliente,
                "id_direccion_principal": id_direccion
            }),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error al actualizar dirección principal")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }

    finally:
        if conn:
            conn.close()
