import json
import logging
import os
import ssl
from typing import Any, Dict, List, Optional
from datetime import datetime

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
    'pendiente', 
    'despachado', 
    'en_viaje', 
    'entregado', 
    'cancelado'
}

def update_orden_produccion_status(cur, payload: Dict[str, Any]) -> Dict[str, Any]:

    required = ["id_envio", "estado"]
    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    order_id = int(payload["id_envio"])
    new_status = str(payload["estado"]).lower()

    if new_status not in VALID_STATES:
        raise ValidationError(f"Estado invalido: {new_status}. Valores permitidos: {', '.join(sorted(VALID_STATES))}")

    rows = run_query(cur, f"SELECT estado FROM {ENV}.envio WHERE id = {order_id}")
    if not rows:
        raise ValidationError("La orden de produccion indicada no existe.")

    current_status = rows[0]["estado"]

    if current_status == new_status:
        raise ValidationError(
            f"La orden {order_id} ya estaba en estado '{new_status}'."
        )

    if new_status == 'despachado':
        fecha_despacho = datetime.now()
        run_command(cur, f"""
            UPDATE {ENV}.envio 
                SET estado = '{new_status}', 
                fecha_despacho = '{fecha_despacho}' 
                WHERE id = {order_id};
        """,)
    elif new_status == 'entregado':
        fecha_entrega = datetime.now()
        run_command(cur, f"""
        UPDATE {ENV}.envio SET estado = '{new_status}' WHERE id = {order_id};
        UPDATE {ENV}.envio SET fecha_entrega = '{fecha_entrega}' WHERE id = {order_id}
        """,)

        query_get_id_orden_venta = run_query(cur, f"""
        select id_orden_venta from {ENV}.envio where id = {order_id};
        """
        )
        id_orden_venta = query_get_id_orden_venta[0]["id_orden_venta"]

        run_command(cur, f"""
        UPDATE {ENV}.orden_venta SET estado = 'entregada' WHERE id = {id_orden_venta};
        UPDATE {ENV}.orden_venta SET fecha_entrega_real = '{fecha_entrega}' WHERE id = {id_orden_venta};
        """,)

        query_get_id_vehiculo = run_query(cur, f"""
            SELECT id_vehiculo 
            FROM {ENV}.envio 
            WHERE id = {order_id};
        """)
        id_vehiculo = query_get_id_vehiculo[0]["id_vehiculo"]
        
        query_get_existen_envios_activos = run_query(cur, f"""
            SELECT 1 
            FROM {ENV}.envio  
            WHERE id_vehiculo = {id_vehiculo} 
            AND estado IN ('despachado', 'en_viaje');
        """)

        if not query_get_existen_envios_activos:
            run_command(cur, f"""
                UPDATE {ENV}.vehiculo 
                SET disponible = true 
                WHERE id = {id_vehiculo};
            """)


    else: 
        run_command(cur, f"UPDATE {ENV}.envio SET estado = '{new_status}' WHERE id = {order_id}",)
    return {
        "order_id": order_id,
        "old_status": current_status,
        "new_status": new_status,
    }


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
            "body": json.dumps({"error": "El cuerpo de la solicitud no puede estar vacío."}),
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
                    "message": "Estado actualizado",
                    "envio_id": result["order_id"],
                    "old_status": result["old_status"],
                    "new_status": result["new_status"],
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
