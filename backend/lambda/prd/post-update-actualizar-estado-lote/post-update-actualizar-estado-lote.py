import json
import logging
import os
import ssl
import random
from typing import Any, Dict, List
from datetime import datetime
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
    """Abre conexión pg8000 + SSL."""
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


def run_command(cur, sql: str):
    """INSERT/UPDATE/DELETE; no retorna filas."""
    cur.execute(sql)

def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    payload = json.loads(event.get("body", "{}"))
    required = ["id_lote", "nuevo_estado"]
    missing = [k for k in required if not payload.get(k)]
    if missing:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": f"Faltan campos: {', '.join(missing)}"})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        id_lote = int(payload["id_lote"])
        nuevo_estado = payload["nuevo_estado"]
        fecha_ingreso = datetime.now()
        fecha_vencimiento = payload.get("fecha_vencimiento")
        observaciones = payload.get("observaciones")
        codigo_lote = payload.get("codigo_lote")

        estados_validos = {"en_cuarentena", "disponible", "rechazado"}
        if nuevo_estado not in estados_validos:
            raise ValidationError(f"Estado inválido. Debe ser uno de: {', '.join(estados_validos)}")

        exists = run_query(cur, f"SELECT 1 FROM {ENV}.lote_materia_prima WHERE id = %s", (id_lote,))
        if not exists:
            raise ValidationError("El lote indicado no existe")

        query = f"""
        UPDATE {ENV}.lote_materia_prima SET fecha_ingreso = '{fecha_ingreso}' WHERE id = {id_lote};
        UPDATE {ENV}.lote_materia_prima SET estado = '{nuevo_estado}' WHERE id = {id_lote}
        """
        run_command(cur, query)

        if fecha_vencimiento:
            query = f"UPDATE {ENV}.lote_materia_prima SET fecha_vencimiento = '{fecha_vencimiento}' WHERE id = {id_lote}"
            run_command(cur, query)

        if observaciones:
            query = f"UPDATE {ENV}.lote_materia_prima SET observaciones = '{observaciones}' WHERE id = {id_lote}"
            run_command(cur, query)

        if codigo_lote:
            query = f"UPDATE {ENV}.lote_materia_prima SET codigo_lote = '{codigo_lote}' WHERE id = {id_lote}"
            run_command(cur, query)

        conn.commit()

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"message": f"Estado del lote {id_lote} actualizado a {nuevo_estado}"}),
        }

    except Exception as e:
        if conn: conn.rollback()
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": str(e)})}
    finally:
        if conn: conn.close()