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

def validate_payload(payload: dict[str, str]) -> tuple[int, int]:
    required = ["mes", "anio"]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")
    mes = payload.get("mes")
    anio = payload.get("anio")

    try:
        mes = int(mes)
        anio = int(anio)
    except (TypeError, ValueError):
        raise ValueError("El parametro 'mes' y 'anio' debe ser un numeros enteros.")

    # Validar rango de mes (1–12)
    if not 1 <= mes <= 12:
        raise ValueError("El parametro 'mes' debe estar entre 1 y 12.")
    if not 2000 <= anio:
        raise ValueError("El parametro 'anio' debe ser mayor a 2000")

    return mes, anio 

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
        mes, anio = validate_payload(payload)
        if mes == 12:
            anio_siguiente = anio + 1
            mes_siguiente = 1
        else:
            anio_siguiente = anio
            mes_siguiente = mes + 1

        query = f"""
        with 
        ingresos as (
            select 
                date(ov.fecha_entrega_real) as fecha,
                sum(ov.valor_total_pedido) as ingresos
            from {ENV}.orden_venta ov
            where ov.estado = 'entregada'
            and fecha_entrega_real >= date '{anio}-{mes}-01'
            and fecha_entrega_real < date '{anio_siguiente}-{mes_siguiente:02d}-01'
            group by date(ov.fecha_entrega_real)
        ),
        costos as (
            select 
                date(lmp.fecha_ingreso) as fecha,
                sum(trunc(lmp.cantidad_total / mp.cantidad_por_unidad_compra) * ppmp.precio)::NUMERIC(10,2) as costos
            from {ENV}.lote_materia_prima lmp 
            inner join {ENV}.proveedor_por_materia_prima ppmp 
                on ppmp.id_proveedor = lmp.id_proveedor 
            inner join {ENV}.materia_prima mp 
                on mp.id = lmp.id_materia_prima 
            where estado not in ('cancelado', 'pedido_generado')
            and fecha_ingreso >= date '{anio}-{mes}-01'
            and fecha_ingreso < date '{anio_siguiente}-{mes_siguiente:02d}-01'
            group by date(lmp.fecha_ingreso)
        )
        select 
            coalesce(i.fecha, c.fecha) AS fecha,
            coalesce(i.ingresos, 0) as ingresos, 
            coalesce(c.costos, 0) as costos,
            coalesce(i.ingresos, 0) - coalesce(c.costos, 0) as ganancias
        from ingresos i
        full outer join costos c on c.fecha = i.fecha
        order by fecha;
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
