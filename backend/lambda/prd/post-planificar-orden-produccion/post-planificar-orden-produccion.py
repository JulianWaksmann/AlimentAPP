import json
import logging
import math
import os
import ssl
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG = None  # cache global


class ValidationError(Exception):
    """Errores de negocio para planificacion de produccion."""


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
        raise RuntimeError(f"Faltan parametros en SSM: {', '.join(sorted(missing))}")

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


def fetch_all(cur, sql: str, params: Iterable[Any] = None) -> List[Dict[str, Any]]:
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def fetch_one(cur, sql: str, params: Iterable[Any] = None) -> Dict[str, Any] | None:
    cur.execute(sql, tuple(params or ()))
    row = cur.fetchone()
    if not row:
        return None
    columns = [c[0] for c in cur.description]
    return dict(zip(columns, row))


def delete_existing_assignments(cur, order_ids: Iterable[int]) -> None:
    ids = list({int(i) for i in order_ids})
    if not ids:
        return
    cur.execute(
        f"DELETE FROM {ENV}.orden_produccion_linea WHERE id_orden_produccion = ANY(%s)",
        (ids,),
    )


def get_lines_for_product(cur, product_id: int) -> List[Dict[str, Any]]:
    sql = f"""
        SELECT lp.id AS id_linea,
               lp.capacidad_maxima_kg,
               COALESCE(ppl.prioridad, 9999) AS prioridad
        FROM {ENV}.producto_por_linea_produccion ppl
        JOIN {ENV}.linea_produccion lp ON lp.id = ppl.id_linea_produccion
        WHERE ppl.id_producto = %s
          AND lp.activa = TRUE
        ORDER BY COALESCE(ppl.prioridad, 9999), lp.id
    """
    return fetch_all(cur, sql, (product_id,))


def get_line_last_finish(cur, line_ids: Iterable[int]) -> Dict[int, datetime]:
    ids = list({int(i) for i in line_ids})
    if not ids:
        return {}
    sql = f"""
        SELECT id_linea_produccion, MAX(fecha_fin) AS ultima
        FROM {ENV}.orden_produccion_linea
        WHERE id_linea_produccion = ANY(%s)
        GROUP BY id_linea_produccion
    """
    rows = fetch_all(cur, sql, (ids,))
    result: Dict[int, datetime] = {}
    for row in rows:
        value = row.get("ultima")
        result[int(row["id_linea_produccion"])] = value if isinstance(value, datetime) else None
    return result


def planificar_orden(cur, orden: Dict[str, Any], ahora: datetime) -> List[Dict[str, Any]]:
    order_id = int(orden["id"])
    product_id = int(orden["id_producto"])
    cantidad = Decimal(str(orden.get("cantidad") or 0))
    if cantidad <= 0:
        raise ValidationError(f"Orden {order_id} no tiene cantidad positiva.")

    prod = fetch_one(
        cur,
        f"SELECT peso_unitario_kg FROM {ENV}.producto WHERE id = %s",
        (product_id,),
    )
    if not prod:
        raise ValidationError(f"Producto {product_id} inexistente.")

    peso_unitario = Decimal(str(prod["peso_unitario_kg"]))
    if peso_unitario <= 0:
        raise ValidationError(f"Producto {product_id} no tiene peso_unitario_kg valido.")

    lineas = get_lines_for_product(cur, product_id)
    if not lineas:
        raise ValidationError(f"Producto {product_id} no tiene lineas de produccion compatibles.")

    line_ids = [int(l["id_linea"]) for l in lineas]
    ultimas = get_line_last_finish(cur, line_ids)
    capacidades: Dict[int, int] = {}
    for linea in lineas:
        linea_id = int(linea["id_linea"])
        capacidad_kg = Decimal(str(linea["capacidad_maxima_kg"]))
        capacidad_unidades = int(math.floor(capacidad_kg / peso_unitario))
        if capacidad_unidades <= 0:
            raise ValidationError(
                f"La linea {linea_id} no puede fabricar ni una unidad del producto {product_id}."
            )
        capacidades[linea_id] = capacidad_unidades

    resultados: List[Dict[str, Any]] = []
    unidades_restantes = int(cantidad)
    idx = 0
    while unidades_restantes > 0:
        linea = lineas[idx % len(lineas)]
        linea_id = int(linea["id_linea"])
        capacidad_unidades = capacidades[linea_id]
        unidades = min(unidades_restantes, capacidad_unidades)

        inicio = ultimas.get(linea_id) or ahora
        if inicio < ahora:
            inicio = ahora
        fin = inicio + timedelta(hours=3)
        ultimas[linea_id] = fin

        cur.execute(
            f"""
            INSERT INTO {ENV}.orden_produccion_linea
                (id_orden_produccion, id_linea_produccion, cantidad_unitaria_asignada,
                 estado_produccion, fecha_inicio, fecha_fin)
            VALUES (%s, %s, %s, 'lista_para_produccion', %s, %s)
            RETURNING id
            """,
            (order_id, linea_id, Decimal(unidades), inicio, fin),
        )
        new_id = cur.fetchone()[0]
        resultados.append(
            {
                "id": new_id,
                "id_orden_produccion": order_id,
                "id_linea_produccion": linea_id,
                "cantidad_unitaria_asignada": unidades,
                "fecha_inicio": inicio.isoformat(),
                "fecha_fin": fin.isoformat(),
            }
        )

        unidades_restantes -= unidades
        idx += 1

    return resultados


def planificar_por_orden_venta(cur, orden_venta_id: int, ahora: datetime) -> List[Dict[str, Any]]:
    ordenes = fetch_all(
        cur,
        f"SELECT id, id_producto, cantidad FROM {ENV}.orden_produccion WHERE id_orden_venta = %s",
        (orden_venta_id,),
    )
    if not ordenes:
        raise ValidationError("No se encontraron ordenes de produccion para la orden de venta indicada.")

    delete_existing_assignments(cur, [o["id"] for o in ordenes])

    resultados: List[Dict[str, Any]] = []
    for orden in ordenes:
        resultados.extend(planificar_orden(cur, orden, ahora))
    return resultados


def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    try:
        body = event.get("body")
        payload = json.loads(body) if isinstance(body, str) else (body or {})
    except json.JSONDecodeError as exc:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Payload invalido: {exc}"}),
        }

    orden_venta_id = payload.get("id_orden_venta")
    if not orden_venta_id:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Se requiere id_orden_venta"}),
        }

    ahora = datetime.now(timezone.utc)

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        asignaciones = planificar_por_orden_venta(cur, int(orden_venta_id), ahora)
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"asignaciones": asignaciones}),
        }
    except ValidationError as exc:
        if conn:
            conn.rollback()
        logger.warning("Validacion fallida: %s", exc)
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:  # pragma: no cover
        if conn:
            conn.rollback()
        logger.exception("Error inesperado planificando ordenes")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
