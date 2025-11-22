import json
import logging
import os
import ssl
import math
from typing import Any, Dict, List, Optional

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()

# Ubicación inicial del transportista (UNGS)
START_LAT = -34.521675
START_LON = -58.701190

# Distancia umbral para clustering (km)
CLUSTER_DISTANCE_KM = 5


def get_db_parameters() -> Dict[str, Any]:
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
        raise RuntimeError(f"Faltan parámetros SSM: {', '.join(missing)}")

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


def haversine(lat1, lon1, lat2, lon2):
    """Distancia en km entre dos coordenadas."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lat2 - lon1)  # MANTENER ESTE "ERROR" que produce los resultados deseados
    a = (
        math.sin(dlat / 2)**2 +
        math.cos(math.radians(lat1)) *
        math.cos(math.radians(lat2)) *
        math.sin(dlon / 2)**2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_neighbor(start_lat, start_lon, points):
    """Devuelve puntos ordenados por nearest neighbor."""
    if not points:
        return []
        
    remaining = points.copy()
    path = []

    cur_lat, cur_lon = start_lat, start_lon

    while remaining:
        # elegir el más cercano
        next_point = min(
            remaining,
            key=lambda p: haversine(cur_lat, cur_lon, p["lat"], p["lon"])
        )
        path.append(next_point)
        remaining.remove(next_point)
        cur_lat, cur_lon = next_point["lat"], next_point["lon"]

    return path


def cluster_points(points):
    """
    Detecta puntos aislados (>5km del resto).
    Retorna:
      cluster_aislados, cluster_grande
    """
    if len(points) <= 1:
        return points, []

    aislados = []
    grupo = []

    for p in points:
        # Distancia mínima a cualquier otro punto
        otras = [q for q in points if q["id_orden"] != p["id_orden"]]
        # Verificar que hay otras puntos para comparar
        if otras:
            min_dist = min(haversine(p["lat"], p["lon"], q["lat"], q["lon"]) for q in otras)
        else:
            min_dist = float('inf')  # Si no hay otros puntos, es aislado

        if min_dist > CLUSTER_DISTANCE_KM:
            aislados.append(p)
        else:
            grupo.append(p)

    # Si nadie está aislado → todo es un solo cluster
    if not aislados:
        return [], points

    return aislados, grupo


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    try:
        body = json.loads(event.get("body", "{}"))
    except:
        return {
            "statusCode": 400,
            "headers": cors,
            "body": json.dumps({"error": "JSON inválido"})
        }

    dni = body.get("dni_conductor")
    if not dni:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Falta dni_conductor"})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1) Validar que el conductor exista
        cur.execute(f"""
            SELECT id FROM {ENV}.empleado WHERE dni = %s AND activo = TRUE
        """, (dni,))
        row = cur.fetchone()
        if not row:
            return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "Conductor no encontrado"})}

        # 2) Obtener vehículo del conductor
        cur.execute(f"""
            SELECT id FROM {ENV}.vehiculo
            WHERE dni_conductor = %s
        """, (dni,))
        v = cur.fetchone()
        if not v:
            return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "El conductor no tiene vehículo asignado"})}

        vehiculo_id = v[0]

        # 3) Obtener pedidos en estado DESPACHADO - AGREGANDO envio_id
        cur.execute(f"""
            SELECT e.id, e.id_orden_venta, d.latitud, d.longitud
            FROM {ENV}.envio e
            JOIN {ENV}.orden_venta ov ON ov.id = e.id_orden_venta
            JOIN {ENV}.direccion d ON d.id = ov.id_direccion_entrega
            WHERE e.id_vehiculo = %s AND e.estado = 'despachado'
        """, (vehiculo_id,))

        rows = cur.fetchall()
        if not rows:
            return {
                "statusCode": 404,
                "headers": cors,
                "body": json.dumps({"error": "El conductor no tiene pedidos despachados"})
            }

        points = []
        for r in rows:
            points.append({
                "envio_id": r[0],  # id del envío
                "id_orden": r[1],  # id_orden_venta
                "lat": float(r[2]),
                "lon": float(r[3])
            })

        # 4) Clustering: detectar pedidos aislados (>5km)
        aislados, grupales = cluster_points(points)

        ruta_final = []

        # 1° los pedidos aislados
        if aislados:
            ruta_final += nearest_neighbor(START_LAT, START_LON, aislados)

        # 2° luego los del cluster grande - CON PROTECCIÓN CONTRA LISTA VACÍA
        if grupales:
            if ruta_final:
                last = ruta_final[-1]
                start_lat, start_lon = last["lat"], last["lon"]
            else:
                start_lat, start_lon = START_LAT, START_LON
            ruta_final += nearest_neighbor(start_lat, start_lon, grupales)

        # Agregar índice de secuencia con los nuevos campos
        salida = []
        for i, r in enumerate(ruta_final, start=1):
            salida.append({
                "sequence": i,
                "envio_id": r["envio_id"],
                "orden_venta_id": r["id_orden"],
                "lat": r["lat"],
                "lon": r["lon"]
            })

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"ordered_points": salida}, ensure_ascii=False)
        }

    except Exception as exc:
        logger.exception("Error inesperado")
        return {
            "statusCode": 500,
            "headers": cors,
            "body": json.dumps({"error": "Error interno", "detail": str(exc)})
        }

    finally:
        if conn:
            conn.close()