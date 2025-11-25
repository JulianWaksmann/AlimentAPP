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

        # 🔹 Query combinada: trae materia prima y sus proveedores asociados activos
        query = f"""
            SELECT 
                mp.id AS id_materia_prima,
                mp.nombre AS nombre_materia_prima,
                mp.unidad_medida AS unidad_medida,
                COALESCE(lotes_json.lotes, '[]'::jsonb) AS lotes
            FROM {ENV}.materia_prima mp
            LEFT JOIN (
                SELECT 
                    lmp.id_materia_prima,
                    jsonb_agg(
                        jsonb_build_object(
                            'id_lote', lmp.id,
                            'codigo_lote', lmp.codigo_lote,
                            'fecha_ingreso', lmp.fecha_ingreso::date,
                            'fecha_vencimiento', lmp.fecha_vencimiento,
                            'cantidad_total', lmp.cantidad_total,
                            'estado', lmp.estado,
                            'nombre_proveedor', COALESCE(p.razon_social, null)
                        )
                    ) AS lotes
                FROM {ENV}.lote_materia_prima lmp
                LEFT JOIN {ENV}.proveedor p ON p.id = lmp.id_proveedor
                GROUP BY lmp.id_materia_prima
            ) AS lotes_json ON lotes_json.id_materia_prima = mp.id;
        """

        resultado = run_query(cur, query)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"materias_primas": resultado}, default=str),
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