import json
import logging
import os
import ssl
import boto3
import pg8000
from typing import Any, Dict, Optional

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación."""


# --- Conexión a la base ---
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
        ssl_context=ssl_context,
        timeout=10,
    )


def run_query(cur, sql: str, params: tuple = None):
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


# --- Handler principal ---
def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    if not payload or "id_orden_produccion" not in payload:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Debe enviar id_orden_produccion"}),
        }

    id_orden_produccion = payload["id_orden_produccion"]

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # --- Query principal: datos de la orden de producción ---
        query = f"""
            SELECT 
                op.id,
                op.id_orden_venta,
                ov.fecha_entrega_solicitada,
                op.id_producto,
                p.nombre AS nombre_producto,
                op.fecha_creacion,
                op.fecha_fin,
                op.estado,
                op.cantidad,
                op.observaciones,
                c.razon_social AS cliente,
                ov.valor_total_pedido
            FROM {ENV}.orden_produccion op
            LEFT JOIN {ENV}.producto p ON op.id_producto = p.id
            LEFT JOIN {ENV}.orden_venta ov ON op.id_orden_venta = ov.id
            LEFT JOIN {ENV}.cliente c ON ov.id_cliente = c.id
            WHERE op.id = %s
        """

        rows = run_query(cur, query, (id_orden_produccion,))
        if not rows:
            raise ValidationError(f"No se encontró la orden de producción con id {id_orden_produccion}")

        orden = rows[0]

        # --- Query secundaria: materias primas asociadas ---
        query_mp = f"""
            SELECT 
                mpop.id,
                mpop.id_lote_materia_prima,
                mpop.cantidad_utilizada,
                mp.nombre AS nombre_materia_prima,
                mp.unidad_medida,
                lmp.codigo_lote,
                lmp.fecha_ingreso
            FROM {ENV}.materia_prima_por_orden_produccion mpop
            JOIN {ENV}.lote_materia_prima lmp ON mpop.id_lote_materia_prima = lmp.id
            JOIN {ENV}.materia_prima mp ON lmp.id_materia_prima = mp.id
            WHERE mpop.id_orden_produccion = %s
        """

        materias_primas = run_query(cur, query_mp, (id_orden_produccion,))

        orden["materias_primas"] = materias_primas

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"orden_produccion": orden}, default=str),
        }

    except ValidationError as e:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": str(e)}),
        }

    except Exception as e:
        logger.exception("Error interno")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }

    finally:
        if conn:
            conn.close()
