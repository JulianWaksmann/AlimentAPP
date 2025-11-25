import json
import logging
import os
import ssl
from typing import Any, Dict, List
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None  # cache SSM


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
    required = ["nombre", "capacidad_maxima_kg", "ids_productos"]
    missing = [key for key in required if key not in payload]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    if not isinstance(payload["ids_productos"], list) or len(payload["ids_productos"]) == 0:
        raise ValidationError("Debe incluirse al menos un producto válido en 'ids_productos'.")

    if payload["capacidad_maxima_kg"] <= 0:
        raise ValidationError("La capacidad máxima debe ser mayor a cero.")


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
        validate_payload(payload)
        conn = get_connection()
        cur = conn.cursor()

        nombre = payload["nombre"]
        descripcion = payload.get("descripcion")
        capacidad_maxima_kg = float(payload["capacidad_maxima_kg"])
        activa = bool(payload.get("activa", True))
        ids_productos = payload["ids_productos"]

        # Insertar la nueva línea
        insert_linea = f"""
            INSERT INTO {ENV}.linea_produccion (nombre, descripcion, capacidad_maxima_kg, activa)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """
        cur.execute(insert_linea, (nombre, descripcion, capacidad_maxima_kg, activa))
        id_linea = cur.fetchone()[0]

        # Asociar productos
        for id_producto in ids_productos:
            insert_rel = f"""
                INSERT INTO {ENV}.producto_por_linea_produccion (id_linea_produccion, id_producto)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING;
            """
            cur.execute(insert_rel, (id_linea, id_producto))

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Línea de producción creada exitosamente",
                "id_linea_produccion": id_linea,
                "productos_asociados": ids_productos
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
