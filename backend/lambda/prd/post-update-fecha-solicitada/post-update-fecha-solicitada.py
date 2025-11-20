import json
import logging
import os
import ssl
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional
import urllib.request

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG: Optional[Dict[str, Any]] = None
SSL_CONTEXT = ssl.create_default_context()

# ARN del planificador para invocarlo tras un cambio de fecha
PLANIFICADOR_ARN = "arn:aws:lambda:us-east-1:554074173959:function:planificador_ordenes_produccion"
API_PLANIFICADOR_DAILY = "https://eldzogehdj.execute-api.us-east-1.amazonaws.com/prd/orden-produccion/planificador_op_daily"

class ValidationError(Exception):
    """Error de validación para el payload."""

def get_db_parameters() -> Dict[str, Any]:
    """Obtiene credenciales de RDS desde SSM y las cachea en memoria."""
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG

    names = [
        "/alimentapp/db/host",
        "/alimentapp/db/password",
        "/alimentapp/db/port",
        "/alimentapp/db/username",
    ]
    resp = ssm_client.get_parameters(Names=names, WithDecryption=True)
    if len(resp["Parameters"]) != len(names):
        missing = set(names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Faltan parámetros en SSM: {', '.join(sorted(missing))}")
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
    """Crea una conexión pg8000 con SSL."""
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=SSL_CONTEXT,
        timeout=10,
    )

def run_query(cur, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y devuelve filas como diccionarios."""
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

def run_command(cur, sql: str, params: tuple = None) -> None:
    """Ejecuta un comando DML (INSERT/UPDATE/DELETE)."""
    cur.execute(sql, params)

def validate_and_update(cur, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Valida el payload y ejecuta la actualización en la base de datos."""
    required = ["id_orden_venta", "nueva_fecha_solicitada"]
    missing = [k for k in required if k not in payload]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    try:
        orden_id = int(payload["id_orden_venta"])
    except (ValueError, TypeError):
        raise ValidationError("El campo 'id_orden_venta' debe ser un número entero.")

    # Validar que la orden de venta exista
    orden_existente = run_query(cur, f"SELECT 1 FROM {ENV}.orden_venta WHERE id = %s", (orden_id,))
    if not orden_existente:
        raise ValidationError(f"La orden de venta con id {orden_id} no existe.")

    # Validar la fecha
    fecha_str = payload["nueva_fecha_solicitada"]
    try:
        # 1. Creamos 'nueva_fecha' como un objeto 'date'.
        nueva_fecha = date.fromisoformat(fecha_str)
        # 2. Usamos 'nueva_fecha' para crear el datetime y sumar las horas y que quede el dia pedido bien.
        nueva_fecha_con_hora = datetime.combine(nueva_fecha, time.min) + timedelta(hours=3)
    except (ValueError, TypeError):
        raise ValidationError("El campo 'nueva_fecha_solicitada' debe tener el formato AAAA-MM-DD.")

    # 3. La comparación se hace con la nueva variable '.date()' para comparar solo el día.
    if nueva_fecha_con_hora.date() <= date.today():
        raise ValidationError("La nueva fecha solicitada debe ser posterior al día de hoy.")

    # actualizamos
    run_command(
        cur,
        f"UPDATE {ENV}.orden_venta SET fecha_entrega_solicitada = %s WHERE id = %s",
        (nueva_fecha_con_hora, orden_id),
    )

    return {
        "orden_id": orden_id,
        "nueva_fecha": nueva_fecha_con_hora.isoformat()
    }

def invocar_planificador(orden_id: int) -> None:
    """Dispara la lambda de planificación en modo asíncrono."""
    payload = {
        "source": "update_fecha_solicitada",
    }
    
    # Llamo a la lambda planificadora
    try:
        lambda_client.invoke(
            FunctionName=PLANIFICADOR_ARN,
            InvocationType="Event",  # Asíncrono
            Payload=json.dumps(payload).encode("utf-8"),
        )
        logger.info(f"Invocado el planificador para la OV {orden_id} debido a cambio de fecha.")
    except Exception as exc:
        logger.exception(f"No se pudo invocar el planificador para la OV {orden_id}: {exc}")

    # Llamo a la lambda planificadora diaria
    try:
        data = json.dumps({}).encode("utf-8")
        
        req = urllib.request.Request(
            API_PLANIFICADOR_DAILY, 
            data=data, 
            method="POST"
        )
        req.add_header("Content-Type", "application/json")

        # Usamos un timeout para no bloquear la lambda
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.getcode()
            logger.info(f"Invocada la API 'API_PLANIFICADOR_DAILY'. Status: {status}")

    except Exception as exc:
        logger.exception(f"No se pudo invocar la API 'API_PLANIFICADOR_DAILY': {exc}")

def lambda_handler(event, context):
    """Punto de entrada de la Lambda para actualizar la fecha de entrega solicitada."""
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        payload = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": "Cuerpo del request no es un JSON válido."})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        resultado = validate_and_update(cur, payload)
        
        conn.commit()
        logger.info(f"Fecha de OV {resultado['orden_id']} actualizada a {resultado['nueva_fecha']}.")

        # Invocar el planificador de forma asíncrona
        invocar_planificador(resultado['orden_id'])

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Fecha de entrega solicitada actualizada correctamente.",
                "orden_venta_id": resultado["orden_id"],
                "nueva_fecha_solicitada": resultado["nueva_fecha"],
            }),
        }
    except ValidationError as exc:
        if conn:
            conn.rollback()
        logger.warning(f"Error de validación: {exc}")
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado al actualizar la fecha de la orden de venta.")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno del servidor", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
