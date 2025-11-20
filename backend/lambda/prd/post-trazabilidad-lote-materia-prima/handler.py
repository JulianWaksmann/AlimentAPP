import json
import base64
from datetime import datetime, date
from decimal import Decimal
import ssl
import os
import logging
from typing import Any, Dict, List, Optional, Iterable

import boto3
import pg8000

# Importamos la función que hemos refactorizado
from report_generator import generar_pdf

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()

class ValidationError(Exception):
    """Error de validación para payloads."""

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

def run_query(cur, sql: str, params: Iterable[Any] = None) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y retorna filas como dicts."""
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

def lambda_handler(event, context):
    """
    Punto de entrada para la Lambda.
    Genera un reporte de trazabilidad en PDF y lo devuelve para descarga.
    """
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    conn = None
    try:
        lote_id_str = None
        if event.get("httpMethod") == "POST":
            body = event.get("body")
            if not body:
                raise ValidationError("El cuerpo de la solicitud no puede estar vacío para POST.")
            payload = json.loads(body)
            lote_id_str = payload.get("lote_id")
        else: # Assume GET for other methods, or default to pathParameters
            lote_id_str = event.get('pathParameters', {}).get('id')

        if not lote_id_str:
            raise ValidationError('Falta el ID del lote en la solicitud (path o body).')
        
        try:
            lote_id = int(lote_id_str)
        except (ValueError, TypeError):
            raise ValidationError('El ID del lote debe ser un número entero.')

        conn = get_connection()
        cur = conn.cursor()

        # --- Consulta segura para el lote de materia prima ---
        query_lote_materia_prima = f"""
            SELECT 
                lmp.id, lmp.codigo_lote, mp.nombre AS nombre_materia_prima,
                p.razon_social AS proveedor, lmp.fecha_ingreso, lmp.fecha_vencimiento,
                lmp.cantidad_total AS cantidad_inicial, lmp.cantidad_unitaria_disponible, mp.unidad_medida
            FROM {ENV}.lote_materia_prima lmp 
            JOIN {ENV}.materia_prima mp ON lmp.id_materia_prima = mp.id
            JOIN {ENV}.proveedor p ON lmp.id_proveedor = p.id
            WHERE lmp.id = %s
        """
        lote_results = run_query(cur, query_lote_materia_prima, (lote_id,))
        
        if not lote_results:
            return {
                "statusCode": 404,
                "headers": {**cors_headers, "Content-Type": "application/json"},
                "body": json.dumps({"error": f"No se encontró el lote de materia prima con ID {lote_id}."}),
            }
        
        # Extraemos el único diccionario de la lista
        lote_materia_prima_data = lote_results[0]

        # --- Consulta segura para las órdenes de producción ---
        query_ordenes_produccion = f"""
            SELECT 
                op.id, p.nombre AS producto_nombre, op.estado, mop.cantidad_utilizada,
                json_build_object(
                    'razon_social', c.razon_social, 'cuil', c.cuil,
                    'nombre_contacto', c.nombre_contacto, 'email', c.email,
                    'telefono', c.telefono
                ) AS cliente
            FROM {ENV}.orden_produccion op
            JOIN {ENV}.producto p ON op.id_producto = p.id
            JOIN {ENV}.materia_prima_por_orden_produccion mop ON op.id = mop.id_orden_produccion
            JOIN {ENV}.orden_venta ov ON op.id_orden_venta = ov.id
            JOIN {ENV}.cliente c ON ov.id_cliente = c.id
            WHERE mop.id_lote_materia_prima = %s;
        """
        ordenes_de_produccion_data = run_query(cur, query_ordenes_produccion, (lote_id,))

        # --- Generación del PDF ---
        logger.info("Generando PDF en memoria...")
        pdf_bytes = generar_pdf(lote_materia_prima_data, ordenes_de_produccion_data)
        logger.info(f"PDF generado, tamaño: {len(pdf_bytes)} bytes.")

        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        logger.info("PDF codificado en Base64.")

        file_name = f"reporte_trazabilidad_lote_{lote_id}.pdf"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/pdf',
                'Content-Disposition': f'attachment; filename="{file_name}"',
                **cors_headers
            },
            'body': pdf_base64,
            'isBase64Encoded': True
        }

    except ValidationError as exc:
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
            "body": json.dumps({"error": "Error interno del servidor", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
