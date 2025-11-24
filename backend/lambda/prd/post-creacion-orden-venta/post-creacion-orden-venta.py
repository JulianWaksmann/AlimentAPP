import json
import logging
import os
import ssl
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List

import boto3
import pg8000
import urllib.request
import urllib.error

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG = None  # cache SSM

# Umbrales para requerir supervisión
THRESHOLD = {
    1: 10,
    2: 15,
    3: 20,
    4: 10,
    5: 20,
    6: 15,
    7: 20
}

class ValidationError(Exception):
    """Error de validación para orden de venta."""


# --- CONEXIÓN ---
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


# --- FUNCIONES AUXILIARES ---
def create_production_orders(cur, order_id: int, items: List[Dict[str, int]]) -> str:
    """Crea órdenes de producción asociadas a la orden de venta."""
    estado_general = 'planificada'
    for item in items:
        cantidad_umbral = THRESHOLD.get(item['id_producto'])
        if cantidad_umbral and item['cantidad'] > cantidad_umbral:
            estado_general = 'pendiente'
            break

    for item in items:
        run_command(cur, f"""
            INSERT INTO {ENV}.orden_produccion (id_orden_venta, id_producto, cantidad, estado)
            VALUES (%s, %s, %s, %s)
        """, (order_id, item['id_producto'], item['cantidad'], estado_general))
    return estado_general

def validate_sale_order_payload(cur, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Valida y prepara los datos de la orden."""
    required = ["id_vendedor", "id_cliente", "productos", "fecha_entrega_solicitada", "con_envio"]
    missing = [k for k in required if k not in payload]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    id_cliente = int(payload["id_cliente"])
    id_vendedor = int(payload["id_vendedor"])
    con_envio = bool(payload["con_envio"])
    prioritario = bool(payload.get("prioritario", False))  # <--- NUEVO CAMPO
    id_direccion_entrega = payload.get("id_direccion_entrega")

    # Validaciones básicas
    if not run_query(cur, f"SELECT 1 FROM {ENV}.cliente WHERE id = %s", (id_cliente,)):
        raise ValidationError("El id_cliente indicado no existe.")
    if not run_query(cur, f"SELECT 1 FROM {ENV}.empleado WHERE id = %s AND activo = TRUE", (id_vendedor,)):
        raise ValidationError("El id_vendedor indicado no existe o está inactivo.")

    # Fecha
    try:
        fecha_entrega_date = date.fromisoformat(payload["fecha_entrega_solicitada"])
    except ValueError:
        raise ValidationError("fecha_entrega_solicitada debe tener formato AAAA-MM-DD.")
    if fecha_entrega_date <= date.today():
        raise ValidationError("fecha_entrega_solicitada debe ser posterior a hoy.")

    fecha_entrega_iso = (datetime.combine(fecha_entrega_date, time.min) + timedelta(hours=3)).isoformat()

    # Validación de dirección
    if con_envio:
        if not id_direccion_entrega:
            raise ValidationError("Debe especificar id_direccion_entrega.")
        else:
            direccion = run_query(cur, f"""
                SELECT 1 FROM {ENV}.direccion WHERE id = %s AND id_cliente = %s
            """, (id_direccion_entrega, id_cliente))
            if not direccion:
                raise ValidationError("La dirección seleccionada no pertenece al cliente.")
    else:
        id_direccion_entrega = None

    # Productos
    productos = payload["productos"]
    if not isinstance(productos, list) or not productos:
        raise ValidationError("productos debe ser una lista con al menos un ítem.")

    items, total = [], 0.0
    for item in productos:
        if "id_producto" not in item or "cantidad" not in item:
            raise ValidationError("Cada producto debe incluir id_producto y cantidad.")
        if item["cantidad"] <= 0:
            raise ValidationError("cantidad debe ser mayor que cero.")

        producto = run_query(cur, f"""
            SELECT precio_venta FROM {ENV}.producto WHERE id = %s AND activo = TRUE
        """, (item["id_producto"],))
        if not producto:
            raise ValidationError(f"Producto {item['id_producto']} inexistente o inactivo.")
        precio_unit = float(producto[0]["precio_venta"])
        total += precio_unit * item["cantidad"]
        items.append({"id_producto": int(item["id_producto"]), "cantidad": int(item["cantidad"])})

    comentario = payload.get("comentario", "Sin comentarios")

    return {
        "id_cliente": id_cliente,
        "id_vendedor": id_vendedor,
        "fecha_entrega_solicitada": fecha_entrega_iso,
        "productos": items,
        "total": total,
        "comentario": comentario,
        "con_envio": con_envio,
        "id_direccion_entrega": id_direccion_entrega,
        "prioritario": prioritario  # <--- NUEVO
    }


def insert_sale_order(cur, validated: Dict[str, Any]):
    """Inserta la orden de venta y genera sus órdenes de producción."""
    run_command(cur, f"""
    INSERT INTO {ENV}.orden_venta
        (id_cliente, id_empleado, fecha_entrega_solicitada, estado, valor_total_pedido,
         observaciones, con_envio, id_direccion_entrega, prioritario)
    VALUES (%s, %s, %s, 'pendiente', %s, %s, %s, %s, %s)
    """, (
    validated['id_cliente'],
    validated['id_vendedor'],
    validated['fecha_entrega_solicitada'],
    validated['total'],
    validated['comentario'],
    validated['con_envio'],
    validated['id_direccion_entrega'],
    validated['prioritario']  
    ))

    order = run_query(cur, f"""
        SELECT id, valor_total_pedido, estado, fecha_pedido
        FROM {ENV}.orden_venta
        WHERE id_cliente = %s
        ORDER BY id DESC
        LIMIT 1
    """, (validated['id_cliente'],))[0]

    # Crear siempre las órdenes de producción
    estado_orden_produccion = create_production_orders(cur, order["id"], validated["productos"])

    # Ajustar el estado de la venta
    if validated.get("prioritario"):
        nuevo_estado_venta = "en_supervision_por_urgencia"
    elif estado_orden_produccion == "pendiente":
        nuevo_estado_venta = "pendiente_supervision"
    else:
        nuevo_estado_venta = "confirmada"

    order["estado"] = nuevo_estado_venta
    return {"orden": order, "nuevo_estado": nuevo_estado_venta}


# --- HANDLER ---
def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        resultado_db = insert_sale_order(cur, validate_sale_order_payload(cur, payload))
        conn.commit()

        orden_creada = resultado_db["orden"]
        nuevo_estado = resultado_db["nuevo_estado"]

        # Actualiza estado
        api_url = "https://eldzogehdj.execute-api.us-east-1.amazonaws.com/prd/crear-orden-venta/update-estado-orden-venta"
        api_payload = {"id_pedido": orden_creada["id"], "estado": nuevo_estado}
        data = json.dumps(api_payload).encode("utf-8")

        req = urllib.request.Request(api_url, data=data, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as response:
                logger.info(f"API de actualización de estado OK ({response.status})")
        except urllib.error.URLError as e:
            logger.error(f"Error al actualizar estado de la orden: {e}")

        # Generar factura
        lambda_client.invoke(
            FunctionName="arn:aws:lambda:us-east-1:554074173959:function:envio-factura-cliente",
            InvocationType="Event",
            Payload=json.dumps({"orden_venta_id": orden_creada["id"]}).encode("utf-8"),
        )

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"message": "Orden creada", "orden": orden_creada}, default=str),
        }

    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": str(exc)})}

    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}

    finally:
        if conn:
            conn.close()
