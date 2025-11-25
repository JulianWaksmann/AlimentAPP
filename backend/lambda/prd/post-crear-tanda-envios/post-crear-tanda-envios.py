import json
import logging
import os
import ssl
from typing import Any, Dict, List, Optional

import boto3
import pg8000

# --- Configuración base ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()

# --- Funciones auxiliares ---
def get_db_parameters() -> Dict[str, Any]:
    """Obtiene las credenciales de conexión a la base de datos desde SSM."""
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
        "port": int(data["port"]),
        "user": data["username"],
        "password": data["password"],
        "database": os.getenv("DB_NAME", "postgres"),
    }
    return DB_CONFIG


def get_connection():
    """Abre conexión a la base de datos."""
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


def run_query(cur, sql: str) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y devuelve resultados como lista de diccionarios."""
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


# --- Lógica principal ---
VALID_STATES = {'pendiente', 'despachado', 'en_viaje', 'entregado', 'cancelado'}

def get_envios_por_estado_por_vehiculo(cur, estado: str) -> List[Dict[str, Any]]:
    """Obtiene todos los envíos en un estado específico."""
    estado = estado.lower()
    if estado not in VALID_STATES:
        raise ValueError(f"Estado inválido: '{estado}'. Estados válidos: {', '.join(sorted(VALID_STATES))}")

    sql = f"""
        with pesos_totales_por_orden_venta as (
            select 
                ov.id as id_orden_venta, 
                sum(op.cantidad * p.peso_unitario_kg) as peso_total_kg		
            from {ENV}.orden_venta ov
            join {ENV}.orden_produccion op on ov.id = op.id_orden_venta 
            join {ENV}.producto p on p.id = op.id_producto
            group by ov.id
        )
        SELECT 
            v.id as id_vehiculo,
		    v.patente,
 		    v.tipo_unidad,
            v.modelo,
    		v.empresa,
    		v.nombre_conductor,
		    v.apellido_conductor,
    		v.dni_conductor,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                	'id_envio', e.id,
                	'estado_envio', e.estado,
                    'id_orden_venta', ov.id,
                    'id_cliente', c.id,
                    'razon_social', c.razon_social,
                    'email', c.email,
                    'nombre_contacto', c.nombre_contacto,
                    'apellido_contacto', c.apellido_contacto,
                    'telefono', c.telefono,
                    'productos', (
                        SELECT JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', op.id_producto,
                                'nombre', p.nombre,
                                'cantidad', op.cantidad
                            ) ORDER BY op.id_producto
                        )
                        FROM {ENV}.orden_produccion op
                        INNER JOIN {ENV}.producto p ON op.id_producto = p.id
                        WHERE op.id_orden_venta = ov.id
                    ),
                    'fecha_despacho', e.fecha_despacho,
                    'fecha_entrega_real', e.fecha_entrega,
                    'fecha_pedido', ov.fecha_pedido::date,
                    'fecha_entrega_solicitada', ov.fecha_entrega_solicitada::date,
                    'valor_total_pedido', ov.valor_total_pedido,
                    'peso_total_pedido', ptpov.peso_total_kg
                ) ORDER BY ov.fecha_pedido DESC
            ) as envios
        from {ENV}.envio e   	
        inner join {ENV}.orden_venta ov on e.id_orden_venta = ov.id
        INNER JOIN {ENV}.cliente c ON c.id = ov.id_cliente
        INNER JOIN {ENV}.vehiculo v ON v.id = e.id_vehiculo
        inner join pesos_totales_por_orden_venta ptpov on ptpov.id_orden_venta = ov.id
        WHERE e.estado = '{estado}'
        GROUP BY v.id
        ORDER BY v.id
    """
    return run_query(cur, sql)


# --- Lambda Handler ---
def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    if not payload or "estado" not in payload:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Debe proporcionar el campo 'estado' en el cuerpo del request."})
        }

    estado = payload["estado"]

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        envios = get_envios_por_estado_por_vehiculo(cur, estado)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"vehiculos": envios}, default=str),
        }

    except ValueError as ve:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": str(ve)}),
        }

    except Exception as exc:
        logger.exception("Error inesperado al obtener los envíos.")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }

    finally:
        if conn:
            conn.close()
