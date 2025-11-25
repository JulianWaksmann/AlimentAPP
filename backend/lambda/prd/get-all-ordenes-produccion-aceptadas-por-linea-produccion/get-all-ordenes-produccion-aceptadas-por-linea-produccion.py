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

DB_CONFIG = None  # cache SSM


class ValidationError(Exception):
    """Error de validación."""


def get_db_parameters():
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
    """Abre conexión pg8000 + SSL."""
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
    """SELECT; devuelve filas como dicts."""
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        query = f"""
WITH materias_primas_agg AS (
    SELECT 
        mpop.id_orden_produccion,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id_lote_materia_prima', lmp.id,
                'codigo_lote', lmp.codigo_lote,
                'id_materia_prima', mp.id,
                'nombre_materia_prima', mp.nombre,
                'unidad_medida_materia_prima', mp.unidad_medida,
                'cantidad_materia_prima', mpop.cantidad_utilizada
            )
        ) AS materias_primas_requeridas
    FROM {ENV}.materia_prima_por_orden_produccion mpop
    JOIN {ENV}.lote_materia_prima lmp ON lmp.id = mpop.id_lote_materia_prima
    JOIN {ENV}.materia_prima mp ON mp.id = lmp.id_materia_prima
    GROUP BY mpop.id_orden_produccion
),
tandas_consumidas AS (
    SELECT 
        orden_produccion_id, 
        SUM(cantidad_kg) AS total_producido
    FROM {ENV}.tanda_produccion
    WHERE estado IN ('en_progreso','completada')
    GROUP BY orden_produccion_id
)
SELECT 
    pplp.id_linea_produccion,
    lp.nombre AS nombre_linea_produccion,
    lp.capacidad_maxima_kg AS capacidad_linea_produccion,
    lp.descripcion AS descripcion_linea_produccion,
    lp.activa AS activa_linea_produccion,
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id_cliente', c.id,
            'id_producto', p.id,
            'id_orden_venta', ov.id,
            'nombre_cliente', c.nombre_contacto,
            'apellido_cliente', c.apellido_contacto,
            'nombre_producto', p.nombre,
            'cantidad_producto', op.cantidad,
            'id_orden_produccion', op.id,
            'fecha_creacion_orden_venta', ov.fecha_pedido::date,
            'cantidad_kg_orden_produccion', (op.cantidad * p.peso_unitario_kg),
            'fecha_entrega_solicitada_orden_venta', ov.fecha_entrega_solicitada::date,
            'materias_primas_requeridas', mp_agg.materias_primas_requeridas
        )
        ORDER BY op.id
    ) FILTER (
        WHERE op.estado = 'lista_para_produccion'
        AND COALESCE(tp.total_producido,0) < (op.cantidad * p.peso_unitario_kg)
    ) AS ordenes_de_produccion_aceptadas
FROM {ENV}.producto_por_linea_produccion pplp
JOIN {ENV}.linea_produccion lp ON lp.id = pplp.id_linea_produccion
JOIN {ENV}.producto p ON p.id = pplp.id_producto
JOIN {ENV}.orden_produccion op ON p.id = op.id_producto
JOIN {ENV}.orden_venta ov ON op.id_orden_venta = ov.id
JOIN {ENV}.cliente c ON ov.id_cliente = c.id
LEFT JOIN materias_primas_agg mp_agg ON mp_agg.id_orden_produccion = op.id
LEFT JOIN tandas_consumidas tp ON tp.orden_produccion_id = op.id
WHERE lp.activa = TRUE
GROUP BY pplp.id_linea_produccion, lp.nombre, lp.capacidad_maxima_kg, lp.descripcion, lp.activa
ORDER BY pplp.id_linea_produccion;
        """
        resultado = run_query(cur, query)
        rows = run_query(cur, query)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"lineas_produccion": resultado}, default=str),
        }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error al obtener proveedores por materia prima")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
