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


def run_query(cur, sql: str) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y retorna filas como dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str):
    """Ejecuta INSERT/UPDATE/DELETE sin retorno."""
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

    body = event.get("body")
    payload = json.loads(body or "{}")

    if payload.get("id_vehiculo") is None:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Falta el campo obligatorio: id_vehiculo"})
        }

    try:
        id_vehiculo = int(payload.get("id_vehiculo"))
    except (ValueError, TypeError):
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "El campo id_vehiculo debe ser un número entero válido"})
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Buscar IDs de pedidos pendientes del vehículo
        query_consultar_ids_pedidos = f"""
            SELECT id_orden_venta 
            FROM {ENV}.envio 
            WHERE id_vehiculo = {id_vehiculo}
              AND estado = 'pendiente'
        """
        columna_ids_pedidos = run_query(cur, query_consultar_ids_pedidos)
        ids_pedidos = [row["id_orden_venta"] for row in columna_ids_pedidos]

        # Actualizar pedidos a 'despachado'
        for id_pedido in ids_pedidos:
            query_update_estado_pedido = f"""
                UPDATE {ENV}.orden_venta 
                SET estado = 'despachado' 
                WHERE id = {id_pedido}
            """
            run_command(cur, query_update_estado_pedido)

        # Actualizar los envíos del vehículo
        query_update_estado_envio = f"""
            UPDATE {ENV}.envio 
            SET estado = 'despachado' 
            WHERE id_vehiculo = {id_vehiculo} 
              AND estado = 'pendiente'
        """
        run_command(cur, query_update_estado_envio)

        # Marcar el vehículo como no disponible
        query_update_estado_vehiculo = f"""
            UPDATE {ENV}.vehiculo
            SET disponible = FALSE
            WHERE id = {id_vehiculo}
        """
        run_command(cur, query_update_estado_vehiculo)

        conn.commit()

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "message": "Estado de envío y pedidos actualizado correctamente"
            }),
        }

    except ValidationError as e:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error general en actualización de lote")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }

    finally:
        if conn:
            conn.close()
