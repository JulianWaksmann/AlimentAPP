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
                mp.unidad_medida,
                prov.id AS id_proveedor,
                prov.razon_social,
                prov.cuil,
                prov.nombre_contacto,
                prov.direccion,
                prov.telefono,
                prov.email,
                ppm.precio AS precio_por_unidad_de_medida
            FROM {ENV}.materia_prima mp
            LEFT JOIN {ENV}.proveedor_por_materia_prima ppm ON mp.id = ppm.id_materia_prima
            LEFT JOIN {ENV}.proveedor prov ON ppm.id_proveedor = prov.id
            WHERE prov.activo = TRUE
            ORDER BY mp.nombre, prov.razon_social
        """

        rows = run_query(cur, query)
        conn.commit()

        # 🔹 Agrupamos resultados por materia prima
        materias_dict = {}
        for row in rows:
            mp_id = row["id_materia_prima"]
            if mp_id not in materias_dict:
                materias_dict[mp_id] = {
                    "id_materia_prima": mp_id,
                    "nombre_materia_prima": row["nombre_materia_prima"],
                    "proveedores": [],
                }

            if row["id_proveedor"]:
                proveedor_info = {
                    "id_proveedor": row["id_proveedor"],
                    "razon_social": row["razon_social"],
                    "cuil": row["cuil"],
                    "nombre_contacto": row["nombre_contacto"],
                    "direccion": row["direccion"],
                    "telefono": row["telefono"],
                    "email": row["email"],
                    "precio_por_unidad_de_medida": row["precio_por_unidad_de_medida"],
                }
                materias_dict[mp_id]["proveedores"].append(proveedor_info)

        resultado = list(materias_dict.values())

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
