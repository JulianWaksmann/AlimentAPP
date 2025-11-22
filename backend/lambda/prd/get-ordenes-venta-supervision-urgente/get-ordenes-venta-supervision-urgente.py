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
ssl_context = ssl.create_default_context()


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


def run_query(cur, sql, params=None):
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    if not rows:
        return []
    cols = [desc[0] for desc in cur.description]
    return [dict(zip(cols, r)) for r in rows]


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

        # 🔍 Buscar órdenes en supervisión por urgencia
        ordenes = run_query(
            cur,
            f"""
            SELECT 
                ov.id,
                ov.fecha_pedido,
                ov.fecha_entrega_solicitada,
                ov.valor_total_pedido,
                ov.observaciones,
                c.id AS id_cliente,
                c.razon_social,
                c.email,
                c.telefono,
                d.direccion_text AS direccion,
                d.zona
            FROM {ENV}.orden_venta ov
            JOIN {ENV}.cliente c ON ov.id_cliente = c.id
            LEFT JOIN {ENV}.direccion d ON c.id_direccion_principal = d.id
            WHERE ov.estado = 'en_supervision_por_urgencia'
            ORDER BY ov.fecha_pedido DESC;
            """,
        )

        # 📦 Adjuntar productos por cada orden
        for o in ordenes:
            productos = run_query(
                cur,
                f"""
                SELECT 
                    op.id_producto,
                    p.nombre,
                    op.cantidad
                FROM {ENV}.orden_produccion op
                JOIN {ENV}.producto p ON op.id_producto = p.id
                WHERE op.id_orden_venta = %s;
                """,
                (o["id"],),
            )
            o["cliente"] = {
                "id": o.pop("id_cliente"),
                "razon_social": o.pop("razon_social"),
                "email": o.pop("email"),
                "telefono": o.pop("telefono"),
                "direccion": o.pop("direccion"),
                "zona": o.pop("zona"),
            }
            o["productos"] = productos

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps(ordenes, default=str),
        }

    except Exception as e:
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }
    finally:
        if conn:
            conn.close()
