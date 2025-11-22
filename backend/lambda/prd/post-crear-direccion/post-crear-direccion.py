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


# --- FUNCIONES BASE ---
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


# --- HANDLER ---
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

    required = ["id_cliente", "direccion_text", "latitud", "longitud"]
    missing = [k for k in required if not payload.get(k)]
    if missing:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": f"Faltan campos: {', '.join(missing)}"}),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        id_cliente = int(payload["id_cliente"])
        direccion_text = payload["direccion_text"]
        latitud = float(payload.get("latitud"))
        longitud = float(payload.get("longitud"))

        ya_tiene_direccion_asociada = run_query(cur, f"""
            select 1 from {ENV}.direccion where id_cliente = {id_cliente}
        """
        )

        if ya_tiene_direccion_asociada:
            run_command(cur, f"""
                INSERT INTO {ENV}.direccion
                    (id_cliente, direccion_text, latitud, longitud, es_principal)
                VALUES (%s, %s, %s, %s, %s)
            """, (id_cliente, direccion_text, latitud, longitud, False))

        else:
            run_command(cur, f"""
                INSERT INTO {ENV}.direccion
                    (id_cliente, direccion_text, latitud, longitud, es_principal)
                VALUES (%s, %s, %s, %s, %s)
            """, (id_cliente, direccion_text, latitud, longitud, True))

        # Obtener id generado
        new_id = run_query(cur, "SELECT LASTVAL() AS id")[0]["id"]
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Dirección creada correctamente",
                "id_direccion": new_id
            }),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error al crear dirección")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }

    finally:
        if conn:
            conn.close()
