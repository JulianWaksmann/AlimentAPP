import json
import logging
import os
import ssl
from typing import Any, Dict, List, Optional
from datetime import datetime
from decimal import Decimal

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación para payloads de orden de produccion."""


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
    """Abre conexión pg8000 + SSL usando credenciales de SSM."""
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


def run_query(cur, sql: str) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y retorna filas como dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str) -> None:
    """Ejecuta INSERT/UPDATE/DELETE."""
    cur.execute(sql)

VALID_STATES = {
    'en_proceso',
    'finalizada'
}

def update_orden_produccion_status(cur, payload: Dict[str, Any]):
    id_linea_produccion = payload.get("id")
    if id_linea_produccion is None:
        raise ValidationError("No se especifica el ID")

    nombre = payload.get("nombre")
    if nombre:
        run_command(cur, f"update {ENV}.linea_produccion set nombre = '{nombre}' where id = {id_linea_produccion}")

    descripcion = payload.get("descripcion")
    if descripcion:
        run_command(cur, f"update {ENV}.linea_produccion set descripcion = '{descripcion}' where id = {id_linea_produccion}")

    capacidad_maxima_kg = payload.get("capacidad_maxima_kg")
    if capacidad_maxima_kg:
        capacidad_maxima_kg = Decimal(capacidad_maxima_kg)
        run_command(cur, f"update {ENV}.linea_produccion set capacidad_maxima_kg = {capacidad_maxima_kg} where id = {id_linea_produccion}")

    activa = payload.get("activa")
    if activa is not None:
        run_command(cur, f"update {ENV}.linea_produccion set activa = '{activa}' where id = {id_linea_produccion}")

    ids_productos = payload.get("ids_productos")
    if ids_productos:
        run_command(cur, f"delete from {ENV}.producto_por_linea_produccion where id_linea_produccion = {id_linea_produccion}")
        for id_producto in ids_productos:
            run_command(cur, f"insert into {ENV}.producto_por_linea_produccion (id_linea_produccion, id_producto) values ({id_linea_produccion}, {id_producto})")

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

    if not payload:
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "El cuerpo de la solicitud no puede estar vacio."}),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        result = update_orden_produccion_status(cur, payload)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "message": "Datos actualizados correctamente",
                }
            ),
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
