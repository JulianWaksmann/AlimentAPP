import json
import logging
import os
import ssl
from typing import Any, Dict
import boto3
import pg8000

# Configuración base
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None


# ---------------- FUNCIONES BASE ----------------

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

    if not resp or "Parameters" not in resp or not resp["Parameters"]:
        raise RuntimeError("No se pudieron obtener parámetros desde SSM")

    if len(resp["Parameters"]) != len(param_names):
        missing = set(param_names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Faltan parámetros en SSM: {', '.join(missing)}")

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
    """Ejecuta SELECT y devuelve resultados como lista de dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


# ---------------- LÓGICA PRINCIPAL ----------------

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

        # 🔹 Consulta para calcular ganancias por fecha
        query = f"""
        WITH 
        ingresos AS (
            SELECT 
                DATE(ov.fecha_entrega_real) AS fecha,
                SUM(ov.valor_total_pedido) AS ingresos
            FROM {ENV}.orden_venta ov
            WHERE ov.estado = 'entregada'
            GROUP BY DATE(ov.fecha_entrega_real)
        ),
        gastos AS (
            SELECT 
                DATE(lmp.fecha_ingreso) AS fecha,
                SUM(
                    TRUNC(lmp.cantidad_total / mp.cantidad_por_unidad_compra) * ppmp.precio
                )::NUMERIC(10,2) AS gastos
            FROM {ENV}.lote_materia_prima lmp
            INNER JOIN {ENV}.proveedor_por_materia_prima ppmp 
                ON ppmp.id_proveedor = lmp.id_proveedor
            INNER JOIN {ENV}.materia_prima mp 
                ON mp.id = lmp.id_materia_prima
            WHERE lmp.estado NOT IN ('cancelado', 'pedido_generado')
            GROUP BY DATE(lmp.fecha_ingreso)
        )
        SELECT 
            COALESCE(i.fecha, g.fecha) AS fecha,
            COALESCE(i.ingresos, 0) - COALESCE(g.gastos, 0) AS ganancias
        FROM ingresos i
        FULL OUTER JOIN gastos g ON g.fecha = i.fecha
        ORDER BY fecha;
        """

        resultados = run_query(cur, query)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"ganancias_por_fecha": resultados}, default=str),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
