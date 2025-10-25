import json
import logging
import os
import ssl
from typing import Any, Dict
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG = None  # cache SSM
PLANIFICADOR_ARN = "arn:aws:lambda:us-east-1:554074173959:function:planificador_ordenes_produccion"

class ValidationError(Exception):
    """Error de validación."""

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
    cur.execute(sql, params)
    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: tuple = None):
    cur.execute(sql, params)


def validate_payload(payload):
    required = ["id", "nuevo_estado"]
    missing = [key for key in required if key not in payload]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    if not isinstance(payload["id"], int):
        raise ValidationError("El campo 'id' debe ser un número entero.")

    if not isinstance(payload["nuevo_estado"], bool):
        raise ValidationError("El campo 'nuevo_estado' debe ser booleano (true/false).")


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
        validate_payload(payload)
        conn = get_connection()
        cur = conn.cursor()

        id_linea = payload["id"]
        nuevo_estado = payload["nuevo_estado"]

        # Verificamos existencia
        existe = run_query(cur, f"SELECT id FROM {ENV}.linea_produccion WHERE id = %s", (id_linea,))
        if not existe:
            raise ValidationError(f"No existe la línea de producción con id={id_linea}")

        # Actualizamos
        run_command(cur, f"UPDATE {ENV}.linea_produccion SET activa = %s WHERE id = %s", (nuevo_estado, id_linea))
        conn.commit()

        # Una vez que tenemos una nueva linea_produccion activa, podemos volver a llamar al algoritmo de priorizacion de OP.
        lambda_client.invoke(
            FunctionName=PLANIFICADOR_ARN, 
            InvocationType="Event", 
            Payload=json.dumps({"source": f"linea_produccion:{id_linea}"}).encode("utf-8")
        )

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": f"Estado de la línea {id_linea} actualizado a {'activa' if nuevo_estado else 'inactiva'}"
            }),
        }

    except ValidationError as e:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)}),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }

    finally:
        if conn:
            conn.close()