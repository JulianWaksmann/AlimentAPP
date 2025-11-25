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

def validate_payload(payload: dict[str, str]) -> tuple[int, int, int, int]:
    required = ["mes_inicio", "anio_inicio", "mes_fin", "anio_fin"]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")
    mes_inicio = payload.get("mes_inicio")
    anio_inicio = payload.get("anio_inicio")
    mes_fin = payload.get("mes_fin")
    anio_fin = payload.get("anio_fin")

    try:
        mes_inicio = int(mes_inicio)
        anio_inicio = int(anio_inicio)
        mes_fin = int(mes_fin)
        anio_fin = int(anio_fin)
    except (TypeError, ValueError):
        raise ValueError("El parametro 'mes' y 'anio' debe ser un numeros enteros.")

    if not 1 <= mes_inicio <= 12 or not 1 <= mes_fin <= 12:
        raise ValueError("Los parametros 'mes' deben estar entre 1 y 12.")
    if anio_inicio <= 2000:
        raise ValueError("El parametro 'anio' debe ser mayor a 2000")
    if anio_inicio > anio_fin or (anio_inicio == anio_fin and mes_inicio >= mes_fin):
        raise ValueError("La fecha de inicio debe ser menor a la fecha fin")
    
    return mes_inicio, anio_inicio, mes_fin, anio_fin

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
        mes_inicio, anio_inicio, mes_fin, anio_fin = validate_payload(payload)

        query = f"""
        WITH 
        ingresos AS (
            SELECT 
                DATE_TRUNC('month', ov.fecha_entrega_real)::date AS fecha_mes,
                SUM(ov.valor_total_pedido) AS ingresos
            FROM {ENV}.orden_venta ov
            WHERE ov.estado = 'entregada'
            AND ov.fecha_entrega_real >= DATE '{anio_inicio}-{mes_inicio}-01'
            AND ov.fecha_entrega_real < DATE '{anio_fin}-{mes_fin}-01'
            GROUP BY DATE_TRUNC('month', ov.fecha_entrega_real)
        ),
        gastos AS (
            SELECT 
                DATE_TRUNC('month', lmp.fecha_ingreso)::date AS fecha_mes,
                SUM(TRUNC(lmp.cantidad_total / mp.cantidad_por_unidad_compra) * ppmp.precio)::NUMERIC(10,2) AS gastos
            FROM {ENV}.lote_materia_prima lmp 
            INNER JOIN {ENV}.proveedor_por_materia_prima ppmp 
                ON ppmp.id_proveedor = lmp.id_proveedor 
            INNER JOIN {ENV}.materia_prima mp 
                ON mp.id = lmp.id_materia_prima 
            WHERE lmp.estado NOT IN ('cancelado', 'pedido_generado')
            AND lmp.fecha_ingreso >= DATE '{anio_inicio}-{mes_inicio}-01'
            AND lmp.fecha_ingreso < DATE '{anio_fin}-{mes_fin}-01'
            GROUP BY DATE_TRUNC('month', lmp.fecha_ingreso)
        )
        SELECT 
            TO_CHAR(COALESCE(i.fecha_mes, g.fecha_mes), 'YYYY-MM') AS mes,
            COALESCE(i.ingresos, 0) AS ingresos, 
            COALESCE(g.gastos, 0) AS gastos,
            COALESCE(i.ingresos, 0) - COALESCE(g.gastos, 0) AS ganancias
        FROM ingresos i
        FULL OUTER JOIN gastos g ON g.fecha_mes = i.fecha_mes
        ORDER BY mes;
        """

        datos_finanzas = run_query(cur, query)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"datos_finanzas": datos_finanzas}, default=str),
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
