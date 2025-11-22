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


def validate_payload(payload: dict[str, str]) -> str:
    required = ["estado"]

    missing = [key for key in required if not payload.get(key)]
    if missing:
        raise ValidationError(f"Faltan campos obligatorios: {', '.join(missing)}")

    estados_posibles = ('planificada', 'en_progreso', 'completada', 'cancelada')
    estado = payload.get("estado")
    if estado not in estados_posibles:
        raise ValidationError("El estado pasado por parámetro no existe")
    return estado


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

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        estado = validate_payload(payload)

        # 🔹 CORREGIDO: el join a mptp ahora se hace con tp.id = mptp.id
        query = f"""
        WITH materias_primas_por_tp AS (
            SELECT
                tp.id,
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'id_lote_materia_prima', lmp.id,
                        'codigo_lote', lmp.codigo_lote,
                        'id_materia_prima', mp.id,
                        'nombre_materia_prima', mp.nombre,
                        'unidad_medida_materia_prima', mp.unidad_medida,
                        'cantidad_materia_prima', mpo.cantidad_utilizada
                    ) ORDER BY lmp.id
                ) AS materias_primas_requeridas
            FROM {ENV}.tanda_produccion tp
            JOIN {ENV}.materia_prima_por_orden_produccion mpo ON tp.orden_produccion_id = mpo.id_orden_produccion
            JOIN {ENV}.lote_materia_prima lmp ON mpo.id_lote_materia_prima = lmp.id
            JOIN {ENV}.materia_prima mp ON lmp.id_materia_prima = mp.id
            GROUP BY tp.id
        )
        SELECT 
            tp.linea_produccion_id AS id_linea_produccion,
            lp.nombre AS nombre_linea_produccion,
            lp.capacidad_maxima_kg AS capacidad_linea_produccion,
            lp.descripcion AS descripcion_linea_produccion,
            lp.activa AS activa_linea_produccion,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id_tanda_produccion', tp.id,
                    'id_orden_produccion', op.id,
                    'id_orden_venta', ov.id,
                    'id_cliente', c.id,
                    'nombre_cliente', c.nombre_contacto,
                    'apellido_cliente', c.apellido_contacto,
                    'id_producto', p.id,
                    'nombre_producto', p.nombre,
                    'cantidad_producto', op.cantidad,
                    'fecha_creacion_orden_venta', ov.fecha_pedido::date,
                    'fecha_entrega_solicitada_orden_venta', ov.fecha_entrega_solicitada::date,
                    'fecha_entrega_real_orden_venta', ov.fecha_entrega_real::date,
                    'fecha_creacion_orden_produccion', op.fecha_creacion::date,
                    'fecha_fin_orden_produccion', op.fecha_fin::date,
                    'estado_tanda_produccion', tp.estado,
                    'cantidad_kg_tanda', tp.cantidad_kg,
                    'secuencia_en_linea', tp.secuencia_en_linea,
                    'tiempo_estimado_min', tp.tiempo_estimado_min,
                    'fecha_inicio_planificada', tp.fecha_inicio_planificada,
                    'fecha_fin_planificada', tp.fecha_fin_planificada,
                    'materias_primas_requeridas', COALESCE(mptp.materias_primas_requeridas, '[]'::jsonb)
                ) ORDER BY tp.id
            ) FILTER (WHERE tp.estado = '{estado}') AS tandas_de_produccion
        FROM {ENV}.tanda_produccion tp
        JOIN {ENV}.linea_produccion lp ON lp.id = tp.linea_produccion_id
        JOIN {ENV}.orden_produccion op ON op.id = tp.orden_produccion_id
        JOIN {ENV}.orden_venta ov ON op.id_orden_venta = ov.id
        JOIN {ENV}.cliente c ON ov.id_cliente = c.id
        JOIN {ENV}.producto p ON op.id_producto = p.id
        LEFT JOIN materias_primas_por_tp mptp ON tp.id = mptp.id
        GROUP BY tp.linea_produccion_id, lp.nombre, lp.capacidad_maxima_kg, lp.descripcion, lp.activa
        HAVING JSONB_AGG(tp.id) FILTER (WHERE tp.estado = '{estado}') IS NOT NULL
        ORDER BY tp.linea_produccion_id;
        """

        lineas_produccion = run_query(cur, query)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"lineas_produccion": lineas_produccion}, default=str),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
