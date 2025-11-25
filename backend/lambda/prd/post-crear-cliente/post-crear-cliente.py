import json
import logging
import os
import ssl
import re  # Importamos modulo de expresiones regulares
import boto3
import pg8000
from typing import Any, Dict, List

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None

# --- Funciones de Validación ---

def validar_formato_email(email: str) -> bool:
    # Formato estándar de email
    patron = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return bool(re.match(patron, email))

def validar_formato_cuil(cuil: str) -> bool:
    # Formato estricto: 2 digitos - 8 digitos - 1 digito (Ej: 33-41244663-1)
    patron = r"^\d{2}-\d{8}-\d{1}$"
    return bool(re.match(patron, cuil))

def validar_solo_texto(texto: str) -> bool:
    # Permite letras (mayus/minus), espacios y caracteres con acento. No numeros.
    if not texto: return True # Si es opcional y viene vacio, pasa
    patron = r"^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$"
    return bool(re.match(patron, texto))

def validar_telefono(telefono: str) -> bool:
    if not telefono: return True
    # Formatos permitidos:
    # +54 9 3464 1395
    # +54 15 2431 0518
    # +54 11 2431 0518
    # Explicación regex: Empieza con +54, espacio, luego (9 o 15 o 11 o 2 a 4 digitos), espacio, 4 digitos, espacio, 4 digitos
    patron = r"^\+54\s(?:9|15|11|\d{2,4})\s\d{4}\s\d{4}$"
    return bool(re.match(patron, telefono))

def validar_payload(payload: Dict) -> List[str]:
    errores = []
    
    # 1. Campos requeridos
    required = ["razon_social", "email", "cuil"]
    missing = [k for k in required if k not in payload or not payload[k]]
    if missing:
        errores.append(f"Faltan campos obligatorios: {', '.join(missing)}")

    # 2. Validación de Email
    if "email" in payload and not validar_formato_email(payload["email"]):
        errores.append("El email tiene un formato inválido.")

    # 3. Validación de CUIL
    if "cuil" in payload and not validar_formato_cuil(payload["cuil"]):
        errores.append("El CUIL debe tener el formato XX-XXXXXXXX-X (Ej: 33-41244663-1).")

    # 4. Validación de Nombre y Apellido (Solo letras)
    if not validar_solo_texto(payload.get("nombre_contacto")):
        errores.append("El nombre de contacto solo puede contener letras.")
    
    if not validar_solo_texto(payload.get("apellido_contacto")):
        errores.append("El apellido de contacto solo puede contener letras.")

    # 5. Validación de Teléfono
    if "telefono" in payload and payload["telefono"]:
        if not validar_telefono(payload["telefono"]):
            errores.append("El teléfono debe tener formato +54 X XXXX XXXX (Ej: +54 9 3464 1395).")

    return errores

# --- Funciones base BD ---
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

def run_query(cur, sql: str, params: tuple = None):
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

# --- Lambda principal ---
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
        body = event.get("body")
        payload = json.loads(body) if isinstance(body, str) else body or {}
    except json.JSONDecodeError:
        return {
            "statusCode": 400, 
            "headers": cors_headers, 
            "body": json.dumps({"error": "El cuerpo de la solicitud no es un JSON válido."})
        }

    # --- EJECUTAR VALIDACIONES ---
    lista_errores = validar_payload(payload)
    if lista_errores:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({
                "error": "Error de validación", 
                "detalles": lista_errores
            }),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Validar unicidad de email y cuil en BD
        existente = run_query(cur, f"""
            SELECT id FROM {ENV}.cliente 
            WHERE email = %s OR cuil = %s
        """, (payload["email"], payload["cuil"]))
        
        if existente:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": "Ya existe un cliente con ese email o CUIL."}),
            }

        # Insertar nuevo cliente con RETURNING id (Mucho más seguro)
        sql_insert = f"""
            INSERT INTO {ENV}.cliente (
                razon_social,
                email,
                cuil,
                nombre_contacto,
                apellido_contacto,
                telefono
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        
        cur.execute(sql_insert, (
            payload["razon_social"],
            payload["email"],
            payload["cuil"],
            payload.get("nombre_contacto"),
            payload.get("apellido_contacto"),
            payload.get("telefono")
        ))
        
        # Obtenemos el ID directamente del insert
        nuevo_id = cur.fetchone()[0]
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Cliente creado correctamente",
                "id_cliente": nuevo_id
            }),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error al crear cliente")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }

    finally:
        if conn:
            conn.close()