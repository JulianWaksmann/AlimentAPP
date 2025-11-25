import json
import logging
import os
import ssl
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None

class ValidationError(Exception):
    pass


def get_db_parameters():
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
        raise RuntimeError("No se obtuvieron parámetros de SSM. Verifica nombres y permisos IAM/region.")

    found = {p["Name"] for p in resp["Parameters"]}
    missing = [n for n in param_names if n not in found]
    if missing:
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


def run_query(cur, sql: str):
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

def validate_payload(payload: dict[str, str]) -> int:
    required = ["anio"]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")
    anio= payload.get("anio")

    try:
        anio = int(anio)
    except (TypeError, ValueError):
        raise ValueError("El parametro 'mes' y 'anio' debe ser un numeros enteros.")
    
    return anio

def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}
    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        anio = validate_payload(payload)
        anio_siguiente = anio + 1
        query = f"""
        SELECT 
            TO_CHAR(DATE_TRUNC('month', fecha_entrega_real), 'YYYY-MM') AS mes,
            COUNT(*) FILTER (
                WHERE estado = 'entregada'
            ) AS entregadas,
            COUNT(*) FILTER (
                WHERE estado = 'entregada' 
                AND (fecha_entrega_real > fecha_entrega_solicitada OR fecha_entrega_real IS NULL)
            ) AS tarde,
            COUNT(*) FILTER (
                WHERE estado = 'entregada' 
                AND fecha_entrega_real <= fecha_entrega_solicitada
            ) AS a_tiempo
        FROM {ENV}.orden_venta 
        WHERE estado = 'entregada'
        AND fecha_entrega_real >= date '{anio}-01-01'
        AND fecha_entrega_real < date '{anio_siguiente}-01-01'
        GROUP BY DATE_TRUNC('month', fecha_entrega_real)
        ORDER BY mes;
        """

        pedidos_entregados_y_entregados_a_tiempo = run_query(cur, query)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"pedidos_entregados_y_entregados_a_tiempo": pedidos_entregados_y_entregados_a_tiempo}, default=str),
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
