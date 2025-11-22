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


def run_query(cur, sql: str):
    """SELECT; devuelve filas como dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 🔹 Estados de interés
        estados = ("lista_para_produccion", "en_proceso", "finalizada")
        estados_str = ", ".join(f"'{e}'" for e in estados)

        # 🔹 Query principal corregida
        query = f"""
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
        WHERE op.estado in ({estados_str})
        ORDER BY op.id;
        """
    
        cur.execute(query)
        rows = cur.fetchall()
        if not rows:
            return {
                "statusCode": 200,
                "headers": {**cors_headers, "Content-Type": "application/json"},
                "body": json.dumps({"ordenes_produccion": []}),
            }

        columns = [desc[0] for desc in cur.description]
        ordenes = [dict(zip(columns, row)) for row in rows]

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"ordenes_produccion": ordenes}, default=str),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()

