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

        query_pedidos = f"""
            SELECT 
                ov.id as "idPedido",
                ov.id_empleado as "idVendedor", 
                ov.id_cliente as "idCliente",
                c.nombre_contacto as "nombreCliente",
                c.apellido_contacto as "apellidoCliente",
                ov.fecha_pedido as "fechaPedido",
                ov.fecha_entrega_solicitada as "fechaSolicitada",
                ov.fecha_entrega_real as "fechaEntrega",
                ov.valor_total_pedido as "valorPedido",
                ov.estado
            FROM {ENV}.orden_venta ov
            LEFT JOIN {ENV}.cliente c ON ov.id_cliente = c.id
            ORDER BY ov.id
            """
        
        pedidos = run_query(cur, query_pedidos)
        logger.info(f"Pedidos encontrados: {len(pedidos)}")
        
        # SEGUNDO: Para cada pedido, obtener sus productos
        pedidos_con_productos = []
        for pedido in pedidos:
            query_productos = f"""
            SELECT 
                op.id_producto as "idProducto",
                p.nombre,
                op.cantidad
            FROM {ENV}.orden_produccion op
            LEFT JOIN {ENV}.producto p ON op.id_producto = p.id
            WHERE op.id_orden_venta = {pedido['idPedido']}
            """
            
            productos = run_query(cur, query_productos)
            
            # Construimos el objeto del pedido con productos
            pedido_completo = {
                "idPedido": pedido['idPedido'],
                "idVendedor": pedido['idVendedor'],
                "idCliente": pedido['idCliente'],
                "nombreCliente": pedido['nombreCliente'],
                "apellidoCliente": pedido['apellidoCliente'],
                "productos": productos,
                "fechaPedido": pedido['fechaPedido'].isoformat() if pedido['fechaPedido'] else None,
                "fechaSolicitada": pedido['fechaSolicitada'].isoformat() if pedido['fechaSolicitada'] else None,
                "fechaEntrega": pedido['fechaEntrega'].isoformat() if pedido['fechaEntrega'] else None,
                "valorPedido": pedido['valorPedido'],
                "estado": pedido['estado']
            }
            
            pedidos_con_productos.append(pedido_completo)
        
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers,"Content-Type": "application/json"},
            "body": json.dumps({"data": pedidos_con_productos}, default=str),
        }
    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": {**cors_headers,"Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers,"Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
