import json
import logging
import os
import ssl
from datetime import date
from typing import Any, Dict, List
import re
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG = None  # cache SSM

class ValidationError(Exception):
    """Error de validaciones"""

ses = boto3.client("ses", region_name="us-east-1")

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
    """Abre conexión pg8000 + SSL con credenciales de SSM."""
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
    """SELECT; devuelve filas como dicts."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

def run_command(cur, sql: str):
    """INSERT/UPDATE/DELETE; no retorna filas."""
    cur.execute(sql)

# Expresiones regulares
NAME_REGEX = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$")
PHONE_REGEX = re.compile(r"^[0-9+\-\s()]+$")
EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
ROL_REGEX = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$")
PASSWORD_REGEX = re.compile(r"^.{8,128}$")
DNI_REGEX = re.compile(r"^\d{7,8}$")

def actualizar_vehiculo(cur, payload: Dict[str, Any]) -> int:
    """Actualiza los campos del vehículo indicados en el payload."""

    if "id" not in payload or not payload["id"]:
        raise ValidationError("Debe incluirse el ID del vehículo a actualizar.")

    vehiculo_id = int(payload["id"])

    cur.execute(f"SELECT 1 FROM {ENV}.vehiculo WHERE id = %s", (vehiculo_id,))
    if not cur.fetchone():
        raise ValidationError(f"No existe un vehículo con id={vehiculo_id}.")

    campos_validos = [
        "empresa",
        "nombre_conductor",
        "apellido_conductor",
        "dni_conductor",
        "tipo_unidad",
        "patente",
        "modelo",
        "capacidad_kg",
        "color",
        "disponible"
    ]

    set_clauses = []
    values = []

    if "empresa" in payload:
        empresa = payload["empresa"].strip()
        if len(empresa) < 2:
            raise ValidationError("El nombre de la empresa es demasiado corto.")
        if not re.match(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s'&.,-]+$", empresa):
            raise ValidationError("El nombre de la empresa contiene caracteres inválidos.")
        set_clauses.append("empresa = %s")
        values.append(empresa)

    if "nombre_conductor" in payload:
        nombre = payload["nombre_conductor"].strip()
        if not re.match(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$", nombre):
            raise ValidationError("El nombre del conductor contiene caracteres inválidos.")
        set_clauses.append("nombre_conductor = %s")
        values.append(nombre)

    if "apellido_conductor" in payload:
        apellido = payload["apellido_conductor"].strip()
        if not re.match(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$", apellido):
            raise ValidationError("El apellido del conductor contiene caracteres inválidos.")
        set_clauses.append("apellido_conductor = %s")
        values.append(apellido)

    if "dni_conductor" in payload:
        dni = str(payload["dni_conductor"]).strip()
        if not re.match(r"^\d{7,8}$", dni):
            raise ValidationError("El DNI del conductor debe tener entre 7 y 8 dígitos.")
        set_clauses.append("dni_conductor = %s")
        values.append(dni)

    if "tipo_unidad" in payload:
        tipo = payload["tipo_unidad"].strip().lower()
        tipos_validos = ["camion", "camioneta", "auto"]
        if tipo not in tipos_validos:
            raise ValidationError(
                f"Tipo de unidad inválido. Debe ser uno de: {', '.join(tipos_validos)}"
            )
        set_clauses.append("tipo_unidad = %s")
        values.append(tipo)

    if "patente" in payload:
        patente = payload["patente"].strip().upper()
        patron_patente = r"^[A-Z]{2,3}\d{3}[A-Z]{0,2}$"
        if not re.match(patron_patente, patente):
            raise ValidationError("Formato de patente inválido.")
        cur.execute(f"SELECT 1 FROM {ENV}.vehiculo WHERE patente = %s AND id <> %s", (patente, vehiculo_id))
        if cur.fetchone():
            raise ValidationError("La patente ya está registrada en otro vehículo.")
        set_clauses.append("patente = %s")
        values.append(patente)

    if "modelo" in payload:
        modelo = payload["modelo"].strip()
        if len(modelo) < 2:
            raise ValidationError("El modelo debe tener al menos 2 caracteres.")
        set_clauses.append("modelo = %s")
        values.append(modelo)

    if "capacidad_kg" in payload:
        try:
            capacidad = float(payload["capacidad_kg"])
            if capacidad <= 0:
                raise ValidationError("La capacidad debe ser mayor que 0 kg.")
        except (ValueError, TypeError):
            raise ValidationError("La capacidad debe ser un número válido.")
        set_clauses.append("capacidad_kg = %s")
        values.append(capacidad)

    if "color" in payload:
        color = payload["color"].strip()
        if not re.match(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$", color):
            raise ValidationError("El color contiene caracteres inválidos.")
        set_clauses.append("color = %s")
        values.append(color)

    if "disponible" in payload:
        disponible = payload["disponible"]
        if not isinstance(disponible, bool):
            raise ValidationError("El campo 'disponible' debe ser true o false.")
        set_clauses.append("disponible = %s")
        values.append(disponible)

    if not set_clauses:
        raise ValidationError("No se proporcionó ningún campo válido para actualizar.")

    # --- Construir y ejecutar UPDATE dinámico ---
    sql = f"""
        UPDATE {ENV}.vehiculo
        SET {', '.join(set_clauses)}
        WHERE id = %s
        RETURNING id;
    """
    values.append(vehiculo_id)
    cur.execute(sql, tuple(values))
    updated_id = cur.fetchone()[0]
    return updated_id


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": ""
        }

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None

    try:
        conn = get_connection()
        cur = conn.cursor()
        resultado = registro_vehiculo(cur, payload)

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"id_nuevo_vehiculo": resultado}),
        }
        
    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()

