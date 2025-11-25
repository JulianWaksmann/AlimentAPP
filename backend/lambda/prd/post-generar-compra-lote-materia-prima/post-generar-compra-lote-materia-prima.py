import json
import logging
import os
import ssl
import random
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict

import boto3
import pg8000

# --- Configuración Estándar ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None  # cache SSM


class ValidationError(Exception):
    """Error de validaciones de negocio."""


# --- Funciones de Conexión ---
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
    """SELECT; devuelve filas como dicts usando parámetros seguros."""
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: tuple = None):
    """INSERT/UPDATE/DELETE; no retorna filas, usando parámetros seguros."""
    cur.execute(sql, params or ())


# --- Generador seguro de código de lote ---
def generar_codigo_lote(cur, id_materia: int, attempts: int = 10) -> str:
    """Genera un código único de lote con formato LT-{id_materia:03d}-{XXXX}"""
    base = f"LT-{id_materia:03d}-"
    for _ in range(attempts):
        codigo = base + str(random.randint(1000, 9999))
        exists = run_query(
            cur,
            f"SELECT 1 FROM {ENV}.lote_materia_prima WHERE codigo_lote = %s AND id_materia_prima = %s",
            (codigo, id_materia),
        )
        if not exists:
            return codigo
    raise RuntimeError("No se pudo generar un código de lote único después de varios intentos.")


# --- Validación del payload ---
def validate_compra_materia_prima_payload(cur, payload: dict):
    required = ["id_materia_prima", "id_proveedor", "cantidad_total"]
    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    try:
        id_materia_prima = int(payload["id_materia_prima"])
        id_proveedor = int(payload["id_proveedor"])
        cantidad_total = Decimal(str(payload["cantidad_total"]))
    except (ValueError, TypeError):
        raise ValidationError("Los IDs y la cantidad deben ser numéricos.")

    proveedor = run_query(cur, f"SELECT razon_social FROM {ENV}.proveedor WHERE id = %s", (id_proveedor,))
    if not proveedor:
        raise ValidationError("Proveedor no encontrado")

    materia = run_query(
        cur,
        f"SELECT nombre, cantidad_por_unidad_compra FROM {ENV}.materia_prima WHERE id = %s",
        (id_materia_prima,),
    )
    if not materia:
        raise ValidationError("Materia Prima no encontrada")

    nombre_materia = materia[0]["nombre"]
    cantidad_por_unidad = materia[0]["cantidad_por_unidad_compra"]
    if not cantidad_por_unidad or Decimal(str(cantidad_por_unidad)) <= 0:
        raise ValidationError(f"La materia prima '{nombre_materia}' no tiene configurada 'cantidad_por_unidad_compra' válida.")

    existe_relacion = run_query(
        cur,
        f"SELECT 1 FROM {ENV}.proveedor_por_materia_prima WHERE id_materia_prima = %s AND id_proveedor = %s AND activo = TRUE",
        (id_materia_prima, id_proveedor),
    )
    if not existe_relacion:
        raise ValidationError(f"El proveedor '{proveedor[0]['razon_social']}' no vende o no tiene activa la materia prima '{nombre_materia}'.")

    return id_materia_prima, id_proveedor, cantidad_total, Decimal(str(cantidad_por_unidad))


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

    try:
        payload = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else event
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "JSON inválido"})}

    if not payload:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Cuerpo vacío"})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        id_materia, id_proveedor, cantidad_total, cantidad_por_unidad = validate_compra_materia_prima_payload(cur, payload)

        cantidad_unitaria_disponible = cantidad_total * cantidad_por_unidad

        codigo_lote = generar_codigo_lote(cur, id_materia)

        run_command(cur, f"""
            INSERT INTO {ENV}.lote_materia_prima (
                id_materia_prima, id_proveedor, codigo_lote,
                cantidad_total, cantidad_unitaria_disponible, estado
            ) VALUES (%s, %s, %s, %s, %s, 'pedido_generado');
        """, (id_materia, id_proveedor, codigo_lote, cantidad_total, cantidad_unitaria_disponible))

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "El pedido se realizó correctamente",
                "codigo_lote": codigo_lote,
                "cantidad_unitaria_disponible": str(cantidad_unitaria_disponible)
            }),
        }

    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": str(exc)})}
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}
    finally:
        if conn:
            conn.close()
