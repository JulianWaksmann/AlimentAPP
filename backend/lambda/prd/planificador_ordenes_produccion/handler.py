"""Lambda que organiza tandas de producción aplicando un algoritmo greedy."""

import json
import logging
import os
import ssl
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional, Tuple

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG: Optional[Dict[str, Any]] = None

ESTADOS_TANDA_FIRMES = ("en_progreso", "completada")
# Capacidad diaria = capacidad_linea * CAPACIDAD_DIARIA_FACTOR (para previews por días)
CAPACIDAD_DIARIA_FACTOR = int(os.getenv("CAPACIDAD_DIARIA_FACTOR", "1"))


class PlanningError(Exception):
    """Errores funcionales durante la planificación de tandas."""


def get_db_parameters() -> Dict[str, Any]:
    """Lee credenciales de RDS desde SSM y las cachea en memoria."""
    # Obtiene y cachea la configuración de la base.
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
    """Crea una conexión pg8000 con SSL hacia RDS."""
    # Abre una conexión reutilizable para la transacción.
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
    """Ejecuta un SELECT y devuelve filas como diccionarios."""
    # Ejecuta la consulta y transforma el resultado en lista de dicts.
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def decimal_value(value: Any, contexto: Optional[str] = None, default: Optional[str] = None) -> Decimal:
    """Normaliza cualquier valor numérico a Decimal."""
    # Convierte valores numéricos a Decimal para cálculos consistentes.
    if value is None or (isinstance(value, str) and not value.strip()):
        if default is not None:
            return Decimal(default)
        raise PlanningError(f"{contexto or 'Valor numérico'} ausente")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise PlanningError(f"{contexto or 'Valor numérico'} inválido: {value}")


def limpiar_tandas_planificadas(cur) -> int:
    """Elimina tandas en estado planificada antes de recalcular."""
    # Resetea la agenda eliminando tandas tentativas previas.
    sql = f"DELETE FROM {ENV}.tanda_produccion WHERE estado = 'planificada'"
    cur.execute(sql)
    logger.info("Se eliminaron %s tandas planificadas previas.", cur.rowcount)
    return cur.rowcount


def obtener_lineas_activas(cur) -> Dict[int, Dict[str, Any]]:
    """Recupera líneas activas junto a su capacidad máxima en kg."""
    # Obtiene líneas habilitadas y su capacidad declarada.
    sql = f"""
        SELECT id, nombre, capacidad_maxima_kg
        FROM {ENV}.linea_produccion
        WHERE activa = TRUE
    """
    lineas = fetch_all(cur, sql)
    if not lineas:
        raise PlanningError("No hay lineas de produccion activas para planificar.")
    return {
        int(linea["id"]): {
            "nombre": linea["nombre"],
            "capacidad": decimal_value(
                linea["capacidad_maxima_kg"],
                contexto=f"capacidad de la linea {linea['nombre']}",
            ),
        }
        for linea in lineas
    }


def obtener_secuencias_existentes(cur) -> Dict[int, int]:
    """Devuelve la última secuencia usada por línea para mantener continuidad."""
    # Calcula el máximo de secuencia entre tandas firmes por línea.
    sql = f"""
        SELECT linea_produccion_id, COALESCE(MAX(secuencia_en_linea), 0) AS max_sec
        FROM {ENV}.tanda_produccion
        WHERE estado = ANY(%s)
        GROUP BY linea_produccion_id
    """
    rows = fetch_all(cur, sql, (list(ESTADOS_TANDA_FIRMES),))
    return {int(row["linea_produccion_id"]): int(row["max_sec"]) for row in rows}


def obtener_compatibilidades(cur) -> Dict[int, List[int]]:
    """Construye un mapa producto -> líneas compatibles."""
    # Lee relaciones producto-línea para filtrar tandas válidas.
    sql = f"""
        SELECT id_producto, id_linea_produccion
        FROM {ENV}.producto_por_linea_produccion
    """
    rows = fetch_all(cur, sql)
    compat: Dict[int, List[int]] = {}
    for row in rows:
        producto_id = int(row["id_producto"])
        linea_id = int(row["id_linea_produccion"])
        compat.setdefault(producto_id, []).append(linea_id)
    return compat


def obtener_ordenes_pendientes(cur) -> List[Dict[str, Any]]:
    """Calcula kilos pendientes por orden `lista_para_produccion`."""
    # Consolida OP activas restando kilos ya cubiertos por tandas firmes.
    sql = f"""
        SELECT
            op.id,
            op.id_producto,
            op.cantidad,
            op.fecha_creacion,
            ov.fecha_entrega_solicitada,
            p.peso_unitario_kg,
            COALESCE(SUM(tp.cantidad_kg), 0) AS kg_firmes
        FROM {ENV}.orden_produccion op
        JOIN {ENV}.producto p ON p.id = op.id_producto
        LEFT JOIN {ENV}.orden_venta ov ON ov.id = op.id_orden_venta
        LEFT JOIN {ENV}.tanda_produccion tp
            ON tp.orden_produccion_id = op.id
           AND tp.estado = ANY(%s)
        WHERE op.estado = 'lista_para_produccion'
        GROUP BY op.id, op.id_producto, op.cantidad, op.fecha_creacion,
                 ov.fecha_entrega_solicitada, p.peso_unitario_kg
    """
    rows = fetch_all(cur, sql, (list(ESTADOS_TANDA_FIRMES),))
    ordenes: List[Dict[str, Any]] = []
    for row in rows:
        cantidad = decimal_value(row["cantidad"], contexto=f"cantidad de la orden {row['id']}")
        peso_unitario = decimal_value(
            row["peso_unitario_kg"],
            contexto=f"peso unitario del producto {row['id_producto']}",
        )
        kg_total = cantidad * peso_unitario
        kg_firmes = decimal_value(
            row["kg_firmes"],
            contexto=f"consumo confirmado de la orden {row['id']}",
            default="0",
        )
        kg_pendientes = kg_total - kg_firmes
        if kg_pendientes <= Decimal("0.0001"):
            continue
        ordenes.append(
            {
                "id": int(row["id"]),
                "id_producto": int(row["id_producto"]),
                "kg_pendientes": kg_pendientes,
                "fecha_creacion": row["fecha_creacion"],
                "fecha_entrega_solicitada": row["fecha_entrega_solicitada"],
            }
        )
    return ordenes


def ordenar_ordenes(ordenes: List[Dict[str, Any]]) -> None:
    """Ordena las órdenes por fecha solicitada y antigüedad."""
    # Prioriza por due date (EDD) y luego por creación/ID.
    def key_fn(item: Dict[str, Any]) -> Tuple[Any, Any, int]:
        due = item["fecha_entrega_solicitada"]
        due_key = due if isinstance(due, datetime) else datetime.max.replace(tzinfo=timezone.utc)
        return (
            due_key,
            item["fecha_creacion"],
            item["id"],
        )

    ordenes.sort(key=key_fn)


def seleccionar_linea(lineas_compatibles: List[int], disponibilidad: Dict[int, Dict[str, Any]]) -> Optional[int]:
    """Elige la línea compatible con menor secuencia y carga acumulada."""
    # Devuelve la línea más libre entre las compatibles.
    candidatas = [linea for linea in lineas_compatibles if linea in disponibilidad]
    if not candidatas:
        return None
    candidatas.sort(
        key=lambda linea: (
            disponibilidad[linea]["sec"],
            disponibilidad[linea]["carga_planificada"],
            linea,
        )
    )
    return candidatas[0]


def insertar_tanda(
    cur,
    orden_id: int,
    linea_id: int,
    kg: Decimal,
    secuencia: int,
) -> None:
    """Inserta una tanda planificada para una orden y línea dadas."""
    # Persiste la tanda en estado planificado con su secuencia.
    sql = f"""
        INSERT INTO {ENV}.tanda_produccion (
            orden_produccion_id,
            linea_produccion_id,
            cantidad_kg,
            estado,
            secuencia_en_linea
        )
        VALUES (%s, %s, %s, 'planificada', %s)
    """
    cur.execute(sql, (orden_id, linea_id, kg, secuencia))


def planificar(cur) -> Dict[str, Any]:
    """Orquesta la planificación greedy y retorna métricas/resumen."""
    # Ejecuta el algoritmo de asignación de tandas end-to-end.
    limpiar_tandas_planificadas(cur)

    lineas = obtener_lineas_activas(cur)
    compat = obtener_compatibilidades(cur)
    secuencias = obtener_secuencias_existentes(cur)
    ordenes = obtener_ordenes_pendientes(cur)

    if not ordenes:
        logger.info("No hay ordenes con kilos pendientes para planificar.")
        return {"nuevas_tandas": 0, "ordenes_planificadas": [], "alertas": []}

    ordenar_ordenes(ordenes)

    disponibilidad = {
        linea_id: {
            "capacidad": data["capacidad"],
            "sec": secuencias.get(linea_id, 0) + 1,
            "carga_planificada": Decimal("0"),
        }
        for linea_id, data in lineas.items()
    }

    total_tandas = 0
    ordenes_planificadas: List[Dict[str, Any]] = []
    alertas: List[Dict[str, Any]] = []

    for orden in ordenes:
        orden_id = orden["id"]
        kg_pendientes = orden["kg_pendientes"]
        lineas_compatibles = compat.get(orden["id_producto"], [])

        if not lineas_compatibles:
            alertas.append(
                {
                    "orden_id": orden_id,
                    "motivo": "sin_linea_compatible",
                }
            )
            continue

        kg_restantes = kg_pendientes
        tandas_creadas = 0

        while kg_restantes > Decimal("0"):
            linea_id = seleccionar_linea(lineas_compatibles, disponibilidad)
            if linea_id is None:
                alertas.append(
                    {
                        "orden_id": orden_id,
                        "motivo": "sin_linea_disponible",
                        "kg_pendientes": float(kg_restantes),
                    }
                )
                break

            capacidad_linea = disponibilidad[linea_id]["capacidad"]
            if capacidad_linea <= Decimal("0"):
                alertas.append(
                    {
                        "orden_id": orden_id,
                        "motivo": "capacidad_no_valida",
                        "linea_id": linea_id,
                    }
                )
                break

            kg_tanda = kg_restantes if kg_restantes <= capacidad_linea else capacidad_linea
            secuencia = disponibilidad[linea_id]["sec"]

            insertar_tanda(cur, orden_id, linea_id, kg_tanda, secuencia)

            disponibilidad[linea_id]["sec"] += 1
            disponibilidad[linea_id]["carga_planificada"] += kg_tanda
            kg_restantes -= kg_tanda
            tandas_creadas += 1
            total_tandas += 1

        if kg_restantes <= Decimal("0"):
            ordenes_planificadas.append(
                {
                    "orden_id": orden_id,
                    "tandas_creadas": tandas_creadas,
                    "kg_total": float(kg_pendientes),
                }
            )

    return {
        "nuevas_tandas": total_tandas,
        "ordenes_planificadas": ordenes_planificadas,
        "alertas": alertas,
    }

# -------- Preview por días (sombra transaccional, sin persistir) --------

def _siguiente_habil(d: datetime) -> datetime:
    # explicacion funcionalidad: desplaza a próximo día hábil si cae sábado o domingo.
    while d.weekday() >= 5:
        d = d + timedelta(days=1)
    return d


def _generar_dias_habiles(desde: Optional[str], dias: int) -> List[str]:
    # explicacion funcionalidad: genera lista de fechas (YYYY-MM-DD) para N días hábiles desde 'desde' o hoy.
    base = datetime.now(timezone.utc)
    if desde:
        try:
            base = datetime.fromisoformat(desde)
            if base.tzinfo is None:
                base = base.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    base = _siguiente_habil(base)
    fechas: List[str] = []
    cur_day = base
    while len(fechas) < max(1, dias):
        if cur_day.weekday() < 5:
            fechas.append(cur_day.date().isoformat())
        cur_day = cur_day + timedelta(days=1)
    return fechas


def _capturar_tandas_sombra(cur) -> List[Dict[str, Any]]:
    # explicacion funcionalidad: ejecuta planificar dentro de la tx y lee tandas 'planificada' generadas.
    resumen = planificar(cur)
    logger.info("[preview] Resumen planificar sombra: %s", resumen)
    filas = fetch_all(
        cur,
        f"""
            SELECT t.id, t.orden_produccion_id, t.linea_produccion_id, t.cantidad_kg,
                   op.id_orden_venta, op.id_producto, p.nombre AS producto,
                   t.secuencia_en_linea
            FROM {ENV}.tanda_produccion t
            JOIN {ENV}.orden_produccion op ON op.id = t.orden_produccion_id
            JOIN {ENV}.producto p ON p.id = op.id_producto
            WHERE t.estado = 'planificada'
            ORDER BY t.linea_produccion_id, t.secuencia_en_linea, t.id
        """,
    )
    logger.info("[preview] Tandas capturadas: %s", len(filas))
    return filas


def _capacidades_diarias(cur) -> Dict[int, Decimal]:
    # explicacion funcionalidad: capacidad/día por línea (capacidad_linea * factor env).
    lineas = obtener_lineas_activas(cur)
    caps: Dict[int, Decimal] = {}
    for lid, meta in lineas.items():
        caps[lid] = meta["capacidad"] * Decimal(str(CAPACIDAD_DIARIA_FACTOR))
    return caps


def _bucket_por_dias(tandas: List[Dict[str, Any]], dias: List[str], caps_dia: Dict[int, Decimal]) -> List[Dict[str, List[Dict[str, Any]]]]:
    # explicacion funcionalidad: asigna tandas a fechas hábiles respetando capacidad diaria por línea.
    restante: List[Dict[int, Decimal]] = []
    for _ in dias:
        restante.append({lid: Decimal(v) for lid, v in caps_dia.items()})

    agenda: List[Dict[str, List[Dict[str, Any]]]] = [{d: []} for d in dias]

    for t in tandas:
        lid = int(t["linea_produccion_id"])
        kg = decimal_value(t["cantidad_kg"], f"kg tanda {t['id']}")
        colocado = False
        for i, d in enumerate(dias):
            disp = restante[i].get(lid, Decimal("0"))
            if disp >= kg:
                agenda[i][d].append(
                    {
                        "op_id": int(t["orden_produccion_id"]),
                        "ov_id": int(t["id_orden_venta"]) if t.get("id_orden_venta") is not None else None,
                        "linea_id": lid,
                        "producto": t.get("producto"),
                        "kg": float(kg),
                    }
                )
                restante[i][lid] = disp - kg
                colocado = True
                break
        if not colocado:
            logger.warning("[preview] Sin capacidad en %s días para tanda %s (línea %s, kg=%s)", len(dias), t["id"], lid, kg)

    return agenda


def preview_por_dias(cur, dias: int, desde: Optional[str]) -> List[Dict[str, List[Dict[str, Any]]]]:
    # explicacion funcionalidad: corre sombra y devuelve agenda por fecha (sin persistir cambios).
    tandas = _capturar_tandas_sombra(cur)
    caps = _capacidades_diarias(cur)
    fechas = _generar_dias_habiles(desde, dias)
    agenda = _bucket_por_dias(tandas, fechas, caps)
    return agenda


def lambda_handler_preview(event, context):
    """Entry point alternativo para preview por días (modo sombra)."""
    # explicacion funcionalidad: devuelve [{fecha:[items]}] sin escribir, usando rollback al final.
    logger.info("Preview por días - evento: %s", event)
    try:
        payload = parse_event(event)
    except PlanningError as exc:
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(exc)})}

    dias = int((payload or {}).get("dias", 0) or 0)
    desde = (payload or {}).get("desde")
    if dias <= 0:
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "Debe indicar 'dias' > 0"})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        agenda = preview_por_dias(cur, dias, desde)
        conn.rollback()
        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(agenda)}
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Error en preview por días")
        return {"statusCode": 500, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}
    finally:
        if conn:
            conn.close()


def parse_event(event: Any) -> Dict[str, Any]:
    """Normaliza la carga útil entrante para soportar API Gateway/SQS."""
    # Acepta eventos con body o dict plano y retorna dict listo.
    if not event:
        return {}
    if isinstance(event, dict) and "body" in event:
        body = event["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                raise PlanningError("Payload invalido")
        if isinstance(body, dict):
            return body
    if isinstance(event, dict):
        return event
    raise PlanningError("Evento no soportado")


def lambda_handler(event, context):
    """Entry point de AWS Lambda para recalcular la agenda de tandas."""
    # Ejecuta la planificación en transacción y devuelve resumen JSON.
    logger.info("Iniciando planificacion de tandas. Evento: %s", event)
    try:
        _ = parse_event(event)  # Reservado para filtros futuros
    except PlanningError as exc:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        resultado = planificar(cur)
        conn.commit()
        logger.info("Planificacion completada. Resultado: %s", resultado)
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(resultado),
        }
    except PlanningError as exc:
        if conn:
            conn.rollback()
        logger.warning("Planificacion interrumpida: %s", exc)
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado en la planificacion")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
