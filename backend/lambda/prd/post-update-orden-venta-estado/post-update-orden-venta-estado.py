import json
import logging
import os
import ssl
from typing import Any, Dict, List, Optional

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VALID_STATES = {
    "pendiente",
    "confirmada",
    "cancelada",
    "en_produccion",
    "lista",
    "entregada",
}

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación para payloads de orden de venta."""


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


def fetch_order_items(cur, order_id: int) -> List[Dict[str, int]]:
    """Obtiene los productos/cantidades asociados a la orden de venta."""
    rows = run_query(
        cur,
        f"""
        SELECT id_producto, cantidad
        FROM {ENV}.orden_venta
        WHERE id_orden_venta = {order_id}
        """,
    )
    if not rows:
        raise ValidationError("La orden de venta no tiene productos asociados.")
    return [
        {"id_producto": int(row["id_producto"]), "cantidad": int(row["cantidad"])}
        for row in rows
    ]


#def ensure_production_orders(cur, order_id: int) -> None:
#    """
#    Crea órdenes de producción planificadas para cada producto que aún no tenga una asignada.
#    """
#    items = fetch_order_items(cur, order_id)
#
#    existing = run_query(
#        cur,
#        f"""
#        SELECT id_producto
#        FROM {ENV}.orden_produccion
#        WHERE id_orden_venta = {order_id}
#        """,
#    )
#    existing_products = {int(row["id_producto"]) for row in existing}
#
#    for item in items:
#        if item["id_producto"] in existing_products:
#            continue  # ya existe una orden de producción para ese producto
#
#        run_command(
#            cur,
#            f"""
#            INSERT INTO {ENV}.orden_produccion (id_orden_venta, id_producto, cantidad, estado)
#            VALUES ({order_id}, {item['id_producto']}, {item['cantidad']}, 'planificada')
#            """,
#        )


def update_sale_order_status(cur, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cambia el estado de una orden_venta y mantiene sincronizadas las ordenes_produccion.
    """
    required = ["id_pedido", "estado"]
    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    order_id = int(payload["id_pedido"])
    new_status = str(payload["estado"]).lower()

    if new_status not in VALID_STATES:
        raise ValidationError(
            f"Estado inválido: {new_status}. Valores permitidos: {', '.join(sorted(VALID_STATES))}"
        )

    rows = run_query(cur, f"SELECT estado FROM {ENV}.orden_venta WHERE id = {order_id}")
    if not rows:
        raise ValidationError("La orden de venta indicada no existe.")

    current_status = rows[0]["estado"]
    if current_status == new_status:
        raise ValidationError(
            f"La orden {order_id} ya estaba en estado '{new_status}'."
        )

    run_command(
        cur,
        f"UPDATE {ENV}.orden_venta SET estado = '{new_status}' WHERE id = {order_id}",
    )

    if new_status == "cancelada":
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_produccion
            SET estado = 'cancelada'
            WHERE id_orden_venta = {order_id}
            """,
        )
    elif new_status == "confirmada":
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_produccion
            SET estado = 'planificada'
            WHERE id_orden_venta = {order_id}
            """,
        )
    elif new_status == "en_produccion":
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_produccion
            SET estado = 'en_proceso'
            WHERE id_orden_venta = {order_id}
            """,
        )
    elif new_status == "lista":
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_produccion
            SET estado = 'finalizada',
                fecha_fin = NOW()
            WHERE id_orden_venta = {order_id}
            """,
        )

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

        result = update_sale_order_status(cur, payload)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "message": "Estado actualizado",
                    "order_id": result["order_id"],
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