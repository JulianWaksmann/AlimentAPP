import json
import logging
import os
import ssl
from datetime import date
from typing import Any, Dict, List

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG = None  # cache SSM

class ValidationError(Exception):
    """Error de validación para orden de venta."""


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
    """Abre conexión pg8000 + SSL con credenciales de SSM."""
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


def run_query(cur, sql: str):
    """SELECT; devuelve filas como dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str):
    """INSERT/UPDATE/DELETE; no retorna filas."""
    cur.execute(sql)


def create_production_orders(cur, order_id: int, items: List[Dict[str, int]]) -> None:
    """Crea ordenes_produccion planificadas para cada producto."""
    for item in items:
        run_command(
            cur,
            f"""
            INSERT INTO {ENV}.orden_produccion (id_orden_venta, id_producto, cantidad, estado)
            VALUES ({order_id}, {item['id_producto']}, {item['cantidad']}, 'planificada')
            """,
        )


def validate_sale_order_payload(cur, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Valida payload: cliente, vendedor, productos, fechas."""
    required = ["id_vendedor", "id_cliente", "productos", "fecha_entrega_solicitada"]
    missing = [k for k in required if not payload.get(k)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    fecha_entrega = payload["fecha_entrega_solicitada"]
    try:
        fecha_entrega_date = date.fromisoformat(fecha_entrega)
    except ValueError:
        raise ValidationError("fecha_entrega_solicitada debe tener formato AAAA-MM-DD.")
    if fecha_entrega_date <= date.today():
        raise ValidationError("fecha_entrega_solicitada debe ser posterior a hoy.")

    if not run_query(cur, f"SELECT 1 FROM {ENV}.cliente WHERE id = {int(payload['id_cliente'])}"):
        raise ValidationError("El id_cliente indicado no existe.")
    if not run_query(
        cur,
        f"SELECT 1 FROM {ENV}.empleado WHERE id = {int(payload['id_vendedor'])} AND activo = TRUE",
    ):
        raise ValidationError("El id_vendedor indicado no existe o está inactivo.")

    productos = payload["productos"]
    if not isinstance(productos, list) or not productos:
        raise ValidationError("productos debe ser una lista con al menos un ítem.")

    items: List[Dict[str, int]] = []
    total = 0.0
    for item in productos:
        if "id_producto" not in item or "cantidad" not in item:
            raise ValidationError("Cada producto debe incluir id_producto y cantidad.")
        if item["cantidad"] <= 0:
            raise ValidationError("cantidad debe ser mayor que cero.")

        producto = run_query(
            cur,
            f"SELECT precio_venta FROM {ENV}.producto WHERE id = {int(item['id_producto'])} AND activo = TRUE",
        )
        if not producto:
            raise ValidationError(f"Producto {item['id_producto']} inexistente o inactivo.")

        precio_unit = float(producto[0]["precio_venta"])
        total += precio_unit * item["cantidad"]
        items.append({"id_producto": int(item["id_producto"]), "cantidad": int(item["cantidad"])})

    return {
        "id_cliente": int(payload["id_cliente"]),
        "id_vendedor": int(payload["id_vendedor"]),
        "fecha_entrega_solicitada": fecha_entrega,
        "productos": items,
        "total": total,
    }


def insert_sale_order(cur, validated: Dict[str, Any]):
    """Inserta orden_venta y ordenes_produccion asociadas."""
    run_command(
        cur,
        f"""
        INSERT INTO {ENV}.orden_venta
            (id_cliente, id_empleado, fecha_entrega_solicitada, estado, valor_total_pedido)
        VALUES ({validated['id_cliente']},
                {validated['id_vendedor']},
                '{validated['fecha_entrega_solicitada']}',
                'pendiente',
                {validated['total']})
        """,
    )

    rows = run_query(
        cur,
        f"""
        SELECT id, valor_total_pedido, estado, fecha_pedido
        FROM {ENV}.orden_venta
        WHERE id_cliente = {validated['id_cliente']}
          AND id_empleado = {validated['id_vendedor']}
        ORDER BY id DESC
        LIMIT 1
        """,
    )
    if not rows:
        raise RuntimeError("No se pudo recuperar la orden recién creada.")

    order = rows[0]
    order["valor_total_pedido"] = float(order["valor_total_pedido"])
    order["fecha_pedido"] = order["fecha_pedido"].isoformat()  # si viene como datetime
    # debo crearlo aca, ya que debo almacenar los productos pedidos.
    create_production_orders(cur, order["id"], validated["productos"])
    return order


def create_sale_order_from_payload(cur, raw_payload: Dict[str, Any]):
    """Valida e inserta la orden completa."""
    validated = validate_sale_order_payload(cur, raw_payload)
    return insert_sale_order(cur, validated)


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

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        resultado = create_sale_order_from_payload(cur, payload)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"message": "Orden creada", "orden": resultado}),
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
