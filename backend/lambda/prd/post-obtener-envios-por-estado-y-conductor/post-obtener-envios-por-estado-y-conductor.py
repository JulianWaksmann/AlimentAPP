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
DB_CONFIG = None

class ValidationError(Exception):
    pass


def get_db_parameters():
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

    if not resp or "Parameters" not in resp or not resp["Parameters"]:
        raise RuntimeError("No se obtuvieron parámetros de SSM. Verifica nombres y permisos IAM/region.")

    found = {p["Name"] for p in resp["Parameters"]}
    missing = [n for n in param_names if n not in found]
    if missing:
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


def run_query(cur, sql: str):
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

def validate_payload(payload: dict[str, str]) -> tuple[str, str]:
    required = ["dni_conductor", "estado_envio"]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")
    dni_conductor = payload.get("dni_conductor")
    estado_envio = payload.get("estado_envio").lower()

    estados_envios_validos = ['pendiente', 'despachado', 'en_viaje', 'entregado', 'cancelado']
    if estado_envio not in estados_envios_validos :
        raise ValueError(f"Los estados permitidos son {estados_envios_validos}")

    return str(dni_conductor), str(estado_envio)

def existe_conductor(cur, dni_conductor: str) -> int:
    row = run_query(cur, f"""
            select id from {ENV}.vehiculo where dni_conductor = '{dni_conductor}'
        """
    )
    if not row:
        raise ValueError(f"El conductor con dni {dni_conductor} no existe")

    return int(row[0]["id"])

def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    body = event.get("body")
    payload = json.loads(body) if isinstance(body, str) else body

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        dni_conductor, estado_envio = validate_payload(payload)
        id_vehiculo = existe_conductor(cur, dni_conductor) 
        

        query = f"""
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
                        'peso_total_pedido', ptpov.peso_total_kg,
                        'direccion_entrega', d.direccion_text
                    ) ORDER BY ov.fecha_pedido DESC
                ) FILTER (WHERE e.estado = '{estado_envio}') as envios
            from {ENV}.vehiculo v  	
            left JOIN {ENV}.envio e ON v.id = e.id_vehiculo
            left join {ENV}.orden_venta ov on e.id_orden_venta = ov.id
            left JOIN {ENV}.cliente c ON c.id = ov.id_cliente
            left join {ENV}.direccion d on ov.id_direccion_entrega = d.id
            left join pesos_totales_por_orden_venta ptpov on ptpov.id_orden_venta = ov.id
            WHERE v.id = {id_vehiculo}
            GROUP BY v.id
            ORDER BY v.id
        """

        envios_por_vehiculo = run_query(cur, query)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"vehiculo": envios_por_vehiculo}, default=str),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
