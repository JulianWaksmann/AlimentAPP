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

def validate_empleado_payload(payload: dict[str, str]):
    required = [
        "dni",
        "email",
        "password",
        "rol",
        "nombre",
        "apellido",
        "telefono",
    ]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    dni = str(payload["dni"]).strip()
    if not DNI_REGEX.fullmatch(dni):
        raise ValidationError("dni debe tener 7 u 8 dígitos numéricos.")

    email = payload["email"].strip()
    if not EMAIL_REGEX.fullmatch(email):
        raise ValidationError("email no tiene un formato valido.")

    password = payload["password"].strip()
    if not PASSWORD_REGEX.fullmatch(password):
        raise ValidationError("password debe tener entre 8 y 128 caracteres.")

    rol = payload["rol"].strip()
    if not ROL_REGEX.fullmatch(rol):
        raise ValidationError("rol solo admite letras y espacios.")

    nombre = payload["nombre"].strip()
    if not NAME_REGEX.fullmatch(nombre):
        raise ValidationError("nombre solo admite letras, espacios o guiones.")

    apellido = payload["apellido"].strip()
    if not NAME_REGEX.fullmatch(apellido):
        raise ValidationError("apellido solo admite letras, espacios o guiones.")

    telefono = payload["telefono"].strip()
    if not PHONE_REGEX.fullmatch(telefono):
        raise ValidationError("telefono solo admite dígitos, +, -, () y espacios.")

def registro_empleado(cur, payload: Dict[str, Any]) -> int:

    validate_empleado_payload(payload)

    dni = payload["dni"]
    email = payload["email"]
    password = payload["password"]
    rol = payload["rol"]
    nombre = payload["nombre"]
    apellido = payload["apellido"]
    telefono = payload["telefono"]

    # Validar que el rol exista
    query_rol = f"SELECT id FROM {ENV}.rol WHERE nombre = '{rol}'"
    rol_result = run_query(cur, query_rol)
    if not rol_result:
        raise ValidationError(f"Rol '{rol}' no encontrado")
    id_rol = rol_result[0]["id"]

    # Validar que el email o dni no existan
    if run_query(cur, f"SELECT 1 FROM {ENV}.empleado WHERE email = '{email}'"):
        raise ValidationError(f"Email '{email}' ya registrado")
    if run_query(cur, f"SELECT 1 FROM {ENV}.empleado WHERE dni = {dni}"):
        raise ValidationError(f"DNI '{dni}' ya registrado")
    
    # Insertar empleado
    insert_empleado = f"""
    INSERT INTO {ENV}.empleado (dni, email, id_rol, nombre, apellido, telefono)
    VALUES ({dni}, '{email}', {id_rol}, '{nombre}', '{apellido}', '{telefono}')
    RETURNING id
    """
    cur.execute(insert_empleado)
    id_nuevo_empleado = cur.fetchone()[0]

    # Crear sesión
    insert_sesion = f"""
    INSERT INTO {ENV}.sesion (id_empleado, password)
    VALUES ({id_nuevo_empleado}, '{password}')
    """
    cur.execute(insert_sesion)

    return id_nuevo_empleado


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
        resultado = registro_empleado(cur, payload)

        conn.commit()

        # Verificar email con SES
        try:
            ses.verify_email_identity(EmailAddress=payload["email"])
            logger.info("Solicitud de verificación enviada a %s", payload["email"])
        except Exception as e:
            logger.warning("Fallo al verificar email en SES: %s", e)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"id_nuevo_empleado": resultado}),
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

