import json
import logging
import os
import ssl
from typing import List, Dict, Any, Tuple
import boto3
import pg8000

# --- Configuración estándar ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None  # cache de SSM


class ValidationError(Exception):
    """Error de validaciones de negocio."""


# --- Funciones de conexión ---
def get_db_parameters() -> Dict[str, Any]:
    """Lee los parámetros de conexión desde AWS SSM."""
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
    """Devuelve una conexión a PostgreSQL con SSL."""
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


# --- Funciones auxiliares ---
def run_query(cur, sql: str, params: tuple = None) -> list[dict[str, Any]]:
    """Ejecuta SELECT y devuelve lista de diccionarios."""
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: tuple = None):
    """Ejecuta INSERT/UPDATE/DELETE sin devolver filas."""
    cur.execute(sql, params or ())


# --- Validación del cuerpo recibido ---
def validate_payload(payload: Dict[str, Any]) -> Tuple[int, List[Dict[str, Any]]]:
    if "id_linea_produccion" not in payload:
        raise ValidationError("Falta 'id_linea_produccion'")
    if "ordenes_produccion" not in payload:
        raise ValidationError("Falta 'ordenes_produccion'")

    id_linea_produccion = payload["id_linea_produccion"]
    ordenes_produccion = payload["ordenes_produccion"]

    if not isinstance(id_linea_produccion, int):
        raise ValidationError("'id_linea_produccion' debe ser un número entero")
    if not isinstance(ordenes_produccion, list) or len(ordenes_produccion) == 0:
        raise ValidationError("'ordenes_produccion' debe ser una lista no vacía")

    for orden in ordenes_produccion:
        if not all(k in orden for k in ("id_orden_produccion", "cantidad_kg")):
            raise ValidationError("Cada orden debe tener 'id_orden_produccion' y 'cantidad_kg'")
        if not isinstance(orden["id_orden_produccion"], int):
            raise ValidationError("'id_orden_produccion' debe ser un entero")
        if not isinstance(orden["cantidad_kg"], (int, float)):
            raise ValidationError("'cantidad_kg' debe ser numérico")

    return id_linea_produccion, ordenes_produccion


# --- Lógica principal de reemplazo de tandas ---
def reemplazar_tandas(cur, id_linea_produccion: int, ordenes: List[Dict[str, Any]]):
    """
    Reemplaza todas las tandas activas ('planificada' y 'en_progreso')
    de una línea de producción por las nuevas.
    Luego marca la línea como inactiva (activa = FALSE).
    """

    # 🔸 Borrar tandas activas para evitar duplicados
    cur.execute(f"""
        DELETE FROM {ENV}.tanda_produccion
        WHERE linea_produccion_id = %s
          AND estado IN ('planificada', 'en_progreso')
    """, (id_linea_produccion,))

    # 🔸 Obtener última secuencia usada
    cur.execute(f"""
        SELECT COALESCE(MAX(secuencia_en_linea), 0)
        FROM {ENV}.tanda_produccion
        WHERE linea_produccion_id = %s
    """, (id_linea_produccion,))
    last_seq = cur.fetchone()[0] or 0

    # 🔸 Insertar nuevas tandas
    for orden in ordenes:
        last_seq += 1
        cur.execute(f"""
            INSERT INTO {ENV}.tanda_produccion (
                orden_produccion_id,
                linea_produccion_id,
                cantidad_kg,
                estado,
                secuencia_en_linea,
                fecha_inicio_planificada,
                creado_en
            )
            VALUES (%s, %s, %s, 'en_progreso', %s, NOW(), NOW())
        """, (
            orden["id_orden_produccion"],
            id_linea_produccion,
            orden["cantidad_kg"],
            last_seq
        ))

    # 🔸 Marcar la línea como inactiva (ya que está en progreso)
    cur.execute(f"""
        UPDATE {ENV}.linea_produccion
        SET activa = FALSE
        WHERE id = %s
    """, (id_linea_produccion,))


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

    # --- Validar payload ---
    try:
        payload = event.get("body")
        if isinstance(payload, str):
            payload = json.loads(payload)
        elif not isinstance(payload, dict):
            raise ValidationError("Cuerpo inválido")
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "JSON inválido"})}
    except ValidationError as ve:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": str(ve)})}

    conn = None
    try:
        id_linea_produccion, ordenes_produccion = validate_payload(payload)

        conn = get_connection()
        cur = conn.cursor()

        reemplazar_tandas(cur, id_linea_produccion, ordenes_produccion)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Tandas reemplazadas correctamente",
                "linea_actualizada": id_linea_produccion,
                "estado_linea": "inactiva"
            })
        }

    except ValidationError as ve:
        if conn:
            conn.rollback()
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": str(ve)})}

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)})
        }

    finally:
        if conn:
            conn.close()
