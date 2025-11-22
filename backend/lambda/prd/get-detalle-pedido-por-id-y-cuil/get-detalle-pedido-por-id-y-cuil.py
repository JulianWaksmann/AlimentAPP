import json
import logging
import os
import ssl
from typing import Any, Dict, Optional, List

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
SSL_CONTEXT = ssl.create_default_context()


class ValidationError(Exception):
    pass


# -----------------------------
# CONEXIÓN A BD (SSM + pg8000)
# -----------------------------
def get_db_parameters() -> Dict[str, Any]:
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG

    names = [
        "/alimentapp/db/host",
        "/alimentapp/db/password",
        "/alimentapp/db/port",
        "/alimentapp/db/username",
    ]
    resp = ssm_client.get_parameters(Names=names, WithDecryption=True)

    if len(resp["Parameters"]) != len(names):
        raise RuntimeError("Faltan parámetros en SSM")

    data = {p["Name"].split("/")[-1]: p["Value"] for p in resp["Parameters"]}
    DB_CONFIG = {
        "host": data["host"],
        "port": int(data["port"]),
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
        ssl_context=SSL_CONTEXT,
        timeout=10,
    )


def run_query(cur, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in rows]


# -----------------------------
# LÓGICA PRINCIPAL
# -----------------------------
def obtener_detalle_pedido(cur, order_id: int, cuil: str) -> Dict[str, Any]:

    # 1) Validar que exista la orden y coincida el CUIL
    row = run_query(
        cur,
        f"""
        SELECT 
            ov.id,
            ov.estado,
            ov.fecha_pedido,
            ov.fecha_entrega_solicitada,
            ov.valor_total_pedido,
            c.id AS id_cliente,
            c.razon_social,
            c.cuil
        FROM {ENV}.orden_venta ov
        JOIN {ENV}.cliente c ON c.id = ov.id_cliente
        WHERE ov.id = %s
        """,
        (order_id,)
    )

    if not row:
        raise ValidationError(f"No existe la orden de venta con id={order_id}")

    ov = row[0]

    if ov["cuil"] != cuil:
        raise ValidationError("El CUIL no coincide con el cliente de la orden.")

    # 2) Obtener productos del pedido (orden_produccion)
    productos = run_query(
        cur,
        f"""
        SELECT 
            op.id_producto,
            p.nombre,
            op.cantidad,
            p.precio_venta
        FROM {ENV}.orden_produccion op
        JOIN {ENV}.producto p ON p.id = op.id_producto
        WHERE op.id_orden_venta = %s
        """,
        (order_id,)
    )

    return {
        "id_pedido_venta": ov["id"],
        "estado_pedido": ov["estado"],
        "fecha_pedido": ov["fecha_pedido"],
        "fecha_entrega_solicitada": ov["fecha_entrega_solicitada"],
        "valor_total_pedido": ov["valor_total_pedido"],
        "cliente": {
            "id_cliente": ov["id_cliente"],
            "razon_social": ov["razon_social"],
            "cuil": ov["cuil"]
        },
        "productos": productos
    }


# -----------------------------
# HANDLER
# -----------------------------
def lambda_handler(event, context):

    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    # OPTIONS
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    # BODY
    try:
        payload = json.loads(event.get("body", "{}"))
    except:
        return {
            "statusCode": 400,
            "headers": cors,
            "body": json.dumps({"error": "Body JSON inválido"})
        }

    if "id_orden_venta" not in payload or "cuil" not in payload:
        return {
            "statusCode": 400,
            "headers": cors,
            "body": json.dumps({"error": "Se requiere id_orden_venta y cuil"})
        }

    order_id = int(payload["id_orden_venta"])
    cuil = str(payload["cuil"])

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        data = obtener_detalle_pedido(cur, order_id, cuil)

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps(data, default=str)
        }

    except ValidationError as e:
        return {
            "statusCode": 400,
            "headers": cors,
            "body": json.dumps({"error": str(e)})
        }
    except Exception as e:
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": "Error interno", "detail": str(e)})
        }
    finally:
        if conn:
            conn.close()
