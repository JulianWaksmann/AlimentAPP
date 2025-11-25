import os
import ssl
import pg8000
import json
import logging
import re
import boto3
import random, string
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from typing import Any, Dict

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

def validate_payload(cur, payload: dict[str, str]) -> str:
    required = [
        "estado_orden_produccion"
    ]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    estados_orden_produccion_validos = {"lista_para_produccion", "en_proceso", "finalizada"}

    estado_orden_produccion = payload["estado_orden_produccion"].strip()
    if estado_orden_produccion not in estados_orden_produccion_validos:
        raise ValidationError(f"Estado de orden de produccion '{estado_orden_produccion}' invalido")
    
    return estado_orden_produccion

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
        estado_orden_produccion = validate_payload(cur, payload)
        result = run_query(cur, f"""
        WITH materias_primas_por_op AS (
            SELECT
                mpo.id_orden_produccion,
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'id_lote_materia_prima', lmp.id,
                        'codigo_lote', lmp.codigo_lote,
                        'id_materia_prima', mp.id,
                        'nombre_materia_prima', mp.nombre,
                        'unidad_medida_materia_prima', mp.unidad_medida,
                        'cantidad_materia_prima', mpo.cantidad_utilizada::text
                    ) ORDER BY lmp.id
                ) AS materias_primas_requeridas
            FROM {ENV}.materia_prima_por_orden_produccion mpo
            JOIN {ENV}.lote_materia_prima lmp ON mpo.id_lote_materia_prima = lmp.id
            JOIN {ENV}.materia_prima mp ON lmp.id_materia_prima = mp.id
            GROUP BY mpo.id_orden_produccion
        )

        SELECT 
            op.id AS id_orden_produccion,
            ov.id AS id_orden_venta,
            c.id AS id_cliente,
            c.nombre_contacto AS nombre_cliente,
            c.apellido_contacto AS apellido_cliente,
            p.id AS id_producto,
            p.nombre AS nombre_producto,
            op.cantidad AS cantidad_producto,
            ov.fecha_pedido::date AS fecha_creacion_orden_venta,
            ov.fecha_entrega_solicitada::date AS fecha_entrega_solicitada_orden_venta,
            ov.fecha_entrega_real::date AS fecha_entrega_real_orden_venta,
            op.fecha_creacion::date AS fecha_creacion_orden_produccion,
            op.fecha_fin::date AS fecha_fin_orden_produccion,
            op.estado AS estado_orden_produccion,
            COALESCE(mpop.materias_primas_requeridas, '[]'::jsonb) AS materias_primas_requeridas
        FROM {ENV}.orden_venta ov
        JOIN {ENV}.cliente c ON ov.id_cliente = c.id
        JOIN {ENV}.orden_produccion op ON op.id_orden_venta = ov.id
        JOIN {ENV}.producto p ON op.id_producto = p.id
        LEFT JOIN materias_primas_por_op mpop ON op.id = mpop.id_orden_produccion
        WHERE op.estado = '{estado_orden_produccion}'
        ORDER BY op.id;
        """
        )

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({f"ordenes_produccion": result}, default = str),
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