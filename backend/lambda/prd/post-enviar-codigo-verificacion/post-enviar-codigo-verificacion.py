import os
import ssl
import pg8000
import json
import logging
import re
import boto3
import random, string
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from typing import Any, Dict

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

SES_CLIENT = boto3.client("ses", region_name="us-east-1")
SENDER_EMAIL = "Coreappg4@gmail.com"

DB_CONFIG = None  # cache SSM

class ValidationError(Exception):
    """Error de validación para orden de venta."""


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

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

def validate_payload(cur, payload: dict[str, str]) -> str:
    required = [
        "email"
    ]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    email = payload["email"].strip()
    if not EMAIL_REGEX.fullmatch(email):
        raise ValidationError("email no tiene un formato válido.")
        
    empleado_result = run_query(cur, f"SELECT 1 FROM {ENV}.empleado WHERE email = '{email}'")
    if not empleado_result:
        raise ValidationError(f"Email '{email}' no registrado")

    return email

def enviar_mail(email, codigo_verificacion):
    try:
        SES_CLIENT.send_email(
            Source=SENDER_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": "Código de verificación"},
                "Body": {
                    "Text": {
                        "Data": (
                            f"Tu código de verificación es: {codigo_verificacion}\n\n"
                            "Este código expira en 10 minutos.\n"
                            "Si no solicitaste este correo, ignoralo."
                        )
                    }
                },
            },
        )
        logger.info(f"Código {codigo_verificacion} enviado a {email}")
    except ClientError as e:
        logger.error(f"Error al enviar correo: {e}")
        raise ValidationError("Error al enviar el correo. Intente mas tarde.")

def generar_codigo():
    return str(random.randint(100000, 999999))

def validar_existencia_codigo_activo(cur, email):
    query_existente = f"""
        SELECT codigo, fecha_expiracion
        FROM {ENV}.codigo_verificacion
        WHERE email = '{email}' AND utilizado = FALSE
    """
    existente = run_query(cur, query_existente)

    if existente:
        expira = existente[0]['fecha_expiracion']
        if expira > datetime.utcnow():
            raise ValidationError("Ya existe un código activo. Espera a que expire o revisa tu correo.")
        else:
            # Expirado → marcar como utilizado
            run_command(cur, f"""
                UPDATE {ENV}.codigo_verificacion
                SET utilizado = TRUE
                WHERE email = '{email}'
            """)

def upsert_codigo_verificacion(cur, email, codigo_verificacion, fecha_expiracion):
    run_command(cur, f"""
        INSERT INTO {ENV}.codigo_verificacion (email, codigo, fecha_expiracion)
            VALUES ('{email}', '{codigo_verificacion}', '{fecha_expiracion}')
                ON CONFLICT (email)
                    DO UPDATE SET codigo = EXCLUDED.codigo,
                        fecha_generacion = CURRENT_TIMESTAMP,
                        fecha_expiracion = EXCLUDED.fecha_expiracion,
                        utilizado = FALSE;
    """)

def enviar_mail_codigo_verif(cur, payload: dict[str, str]):
    email = validate_payload(cur, payload)
    validar_existencia_codigo_activo(cur, email)
    codigo_verificacion = generar_codigo()
    fecha_expiracion = datetime.utcnow() + timedelta(minutes=10)
    upsert_codigo_verificacion(cur, email, codigo_verificacion, fecha_expiracion)
    enviar_mail(email, codigo_verificacion)


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
        enviar_mail_codigo_verif(cur, payload)

        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"message": "Se envio un codigo de verificacion a tu casilla de correo"}),
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