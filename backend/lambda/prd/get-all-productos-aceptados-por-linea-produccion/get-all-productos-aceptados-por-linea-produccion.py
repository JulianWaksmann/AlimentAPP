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

DB_CONFIG = None  # cache SSM


class ValidationError(Exception):
    """Error de validación."""


def get_db_parameters():
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


def run_query(cur, sql: str, params: tuple = None):
    """SELECT; devuelve filas como dicts."""
    cur.execute(sql, params or ())
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

        # 🔹 Query combinada: trae las lineas de produccion y sus produtos asociados
        query = f"""
        SELECT 
            lp.id AS id_linea_produccion,
            lp.nombre AS nombre_linea_produccion,
            lp.capacidad_maxima_kg,
            lp.descripcion,
            lp.activa,
            p.id AS id_producto,
            p.nombre as nombre_producto
        FROM {ENV}.linea_produccion lp
        LEFT JOIN {ENV}.producto_por_linea_produccion pplp ON pplp.id_linea_produccion = lp.id
        LEFT JOIN {ENV}.producto p ON p.id = pplp.id_producto
        ORDER BY lp.activa desc
        """

        rows = run_query(cur, query)
        conn.commit()

        # Agrupamos resultados por producto
        linea_produccion_dict = {}
        for row in rows:
            linea_produccion_id = row["id_linea_produccion"]
            if linea_produccion_id not in linea_produccion_dict:
                linea_produccion_dict[linea_produccion_id] = {
                    "id": linea_produccion_id,
                    "nombre": row["nombre_linea_produccion"],
                    "capacidad_maxima_kg": row["capacidad_maxima_kg"],
                    "descripcion": row["descripcion"],
                    "activa": row ["activa"],
                    "productos": [],
                }

            if row["id_producto"]:
                producto_info = {
                    "id": row["id_producto"],
                    "nombre": row["nombre_producto"],
                }
                linea_produccion_dict[linea_produccion_id]["productos"].append(producto_info)

        resultado = list(linea_produccion_dict.values())

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"lineas_produccion": resultado}, default=str),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error al obtener proveedores por materia prima")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
