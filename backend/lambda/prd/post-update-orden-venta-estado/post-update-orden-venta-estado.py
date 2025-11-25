import json
import logging
import os
import ssl
from typing import Any, Dict, List, Optional
from datetime import datetime

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

VALID_STATES = {
    'pendiente',
    'pendiente_supervision',
    'en_supervision_por_urgencia',
    'confirmada',
    'cancelada',
    'en_produccion',
    'lista',
    'asignada_para_envio',
    'despachado',
    'entregada'
}

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación para payloads de orden de venta."""


# --- Conexión a base ---
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
        ssl_context=ssl_context,
        timeout=10,
    )


def run_query(cur, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: tuple = None) -> None:
    cur.execute(sql, params or ())


# --- Lógica principal ---
def update_sale_order_status(cur, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cambia el estado y/o comentario de una orden_venta.
    Si el estado es 'entregada', actualiza la fecha_entrega_real.
    """
    required = ["id_pedido"]
    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    order_id = int(payload["id_pedido"])
    new_status = payload.get("estado")  # opcional
    comentario = payload.get("comentario")  # opcional

    # Verificar que exista la orden
    rows = run_query(cur, f"SELECT estado FROM {ENV}.orden_venta WHERE id = %s", (order_id,))
    if not rows:
        raise ValidationError("La orden de venta indicada no existe.")

    current_status = rows[0]["estado"]

    # Si no se pasa estado, solo se actualiza el comentario
    if not new_status:
        if not comentario:
            raise ValidationError("Debe indicar al menos un campo a actualizar (estado o comentario).")
        run_command(cur, f"UPDATE {ENV}.orden_venta SET observaciones = %s WHERE id = %s", (comentario, order_id))
        return {"order_id": order_id, "old_status": current_status, "new_status": current_status, "comentario_actualizado": True}

    new_status = str(new_status).lower()

    if new_status not in VALID_STATES:
        raise ValidationError(f"Estado inválido: {new_status}. Valores permitidos: {', '.join(sorted(VALID_STATES))}")

    if current_status == new_status:
        raise ValidationError(f"La orden {order_id} ya estaba en estado '{new_status}'.")

    # --- Actualizar estado ---
    if new_status == "entregada":
        fecha_actual = datetime.now().isoformat()
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_venta
            SET estado = %s,
                fecha_entrega_real = %s,
                observaciones = COALESCE(%s, observaciones)
            WHERE id = %s
            """,
            (new_status, fecha_actual, comentario, order_id),
        )
    else:
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_venta
            SET estado = %s,
                observaciones = COALESCE(%s, observaciones)
            WHERE id = %s
            """,
            (new_status, comentario, order_id),
        )

    # Actualización de orden_produccion relacionada
    if new_status == "cancelada":
        run_command(cur, f"UPDATE {ENV}.orden_produccion SET estado = 'cancelada' WHERE id_orden_venta = %s", (order_id,))
    elif new_status == "confirmada":
        run_command(cur, f"UPDATE {ENV}.orden_produccion SET estado = 'planificada' WHERE id_orden_venta = %s", (order_id,))
        print('se pasa a confirmada la orden de venta: ', order_id)
    elif new_status == "en_produccion":
        run_command(cur, f"UPDATE {ENV}.orden_produccion SET estado = 'en_proceso' WHERE id_orden_venta = %s", (order_id,))
    elif new_status == "lista":
        run_command(
            cur,
            f"""
            UPDATE {ENV}.orden_produccion
            SET estado = 'finalizada',
                fecha_fin = NOW()
            WHERE id_orden_venta = %s
            """,
            (order_id,),
        )

    return {
        "order_id": order_id,
        "old_status": current_status,
        "new_status": new_status,
        "comentario": comentario,
    }


# --- Handler ---
def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    if not payload:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "El cuerpo de la solicitud no puede estar vacío."}),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        result = update_sale_order_status(cur, payload)
        conn.commit()

        if result["new_status"] == 'confirmada':
            print('llamamos al gestor de materia prima')
            # Llamos al gestor de materia prima, para que se pida materia prima si es necesario y llame a la asignacion automatica.
            payload_gestion_mp = {
                "id_orden_venta": result["order_id"]
            }

            lambda_client.invoke(
                FunctionName='gestion-materia-prima',
                InvocationType='Event',  # 'Event' es para "fire-and-forget"
                Payload=json.dumps(payload_gestion_mp)
            )

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "message": "Orden actualizada correctamente",
                "order_id": result["order_id"],
                "old_status": result["old_status"],
                "new_status": result["new_status"],
                "comentario": result.get("comentario"),
            }),
        }

    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {"statusCode": 400, "headers": cors_headers, "body": json.dumps({"error": str(exc)})}
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado")
        return {"statusCode": 500, "headers": cors_headers, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}
    finally:
        if conn:
            conn.close()
