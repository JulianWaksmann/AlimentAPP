"""Lambda shadow: preview por días hábiles usando planificación en sombra (rollback)."""

import json
import logging
import os
import ssl
from datetime import datetime, timezone, timedelta, date
try:
    from zoneinfo import ZoneInfo  # Python 3.9+
except ImportError:  # pragma: no cover
    ZoneInfo = None  # Fallback a offset fijo si no está disponible
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
CAPACIDAD_DIARIA_FACTOR = int(os.getenv("CAPACIDAD_DIARIA_FACTOR", "2"))


class PlanningError(Exception):
    """Errores funcionales durante la planificación/preview."""


def get_db_parameters() -> Dict[str, Any]:
    """lee credenciales de RDS desde SSM y las cachea en memoria."""
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
        raise PlanningError(f"Faltan parámetros en SSM: {', '.join(sorted(missing))}")
    data = {p["Name"].split("/")[-1]: p["Value"] for p in resp["Parameters"]}
    DB_CONFIG = {
        "host": data["host"],
        "port": int(data.get("port", "5432")),
        "user": data["username"],
        "password": data["password"],
        "database": os.getenv("DB_NAME", "postgres"),
    }
    logger.info("Parámetros DB cargados (schema=%s)", ENV)
    return DB_CONFIG


def get_connection():
    """abre una conexión pg8000 con SSL y timeout."""
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
    """ejecuta SELECT y devuelve lista de dicts (columns → values)."""
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def decimal_value(value: Any, contexto: Optional[str] = None, default: Optional[str] = None) -> Decimal:
    """normaliza a Decimal con mensajes claros para cálculos monetarios/medidas."""
    if value is None or (isinstance(value, str) and not value.strip()):
        if default is not None:
            return Decimal(default)
        raise PlanningError(f"{contexto or 'Valor numérico'} ausente")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise PlanningError(f"{contexto or 'Valor numérico'} inválido: {value}")


# ---- Helpers del planificador (misma heurística) ----

def limpiar_tandas_planificadas(cur) -> int:
    """elimina tandas estado 'planificada' para recalcular desde cero."""
    sql = f"DELETE FROM {ENV}.tanda_produccion WHERE estado = 'planificada'"
    cur.execute(sql)
    logger.info("Se eliminaron %s tandas planificadas previas.", cur.rowcount)
    return cur.rowcount


def obtener_lineas_activas(cur) -> Dict[int, Dict[str, Any]]:
    """retorna líneas activas con su capacidad máxima en kg."""
    sql = f"""
        SELECT id, nombre, capacidad_maxima_kg
        FROM {ENV}.linea_produccion
        WHERE activa = TRUE
    """
    rows = fetch_all(cur, sql)
    if not rows:
        raise PlanningError("No hay líneas de producción activas.")
    return {
        int(r["id"]): {
            "nombre": r["nombre"],
            "capacidad": decimal_value(r["capacidad_maxima_kg"], contexto=f"capacidad línea {r['nombre']}")
        }
        for r in rows
    }


def obtener_secuencias_existentes(cur) -> Dict[int, int]:
    """obtiene última secuencia usada por línea (para continuidad)."""
    sql = f"""
        SELECT linea_produccion_id, COALESCE(MAX(secuencia_en_linea), 0) AS max_sec
        FROM {ENV}.tanda_produccion
        WHERE estado = ANY(%s)
        GROUP BY linea_produccion_id
    """
    rows = fetch_all(cur, sql, (list(ESTADOS_TANDA_FIRMES),))
    return {int(r["linea_produccion_id"]): int(r["max_sec"]) for r in rows}


def obtener_compatibilidades(cur) -> Dict[int, List[int]]:
    """mapa producto → líneas compatibles."""
    sql = f"SELECT id_producto, id_linea_produccion FROM {ENV}.producto_por_linea_produccion"
    rows = fetch_all(cur, sql)
    compat: Dict[int, List[int]] = {}
    for r in rows:
        compat.setdefault(int(r["id_producto"]), []).append(int(r["id_linea_produccion"]))
    return compat


def obtener_ordenes_pendientes(cur) -> List[Dict[str, Any]]:
    """calcula kilos pendientes por OP (kg_totales − kg firmes)."""
    sql = f"""
        SELECT
            op.id,
            op.id_producto,
            op.cantidad,
            op.fecha_creacion,
            ov.fecha_entrega_solicitada,
            ov.prioritario,
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
                 ov.fecha_entrega_solicitada, ov.prioritario, p.peso_unitario_kg
    """
    rows = fetch_all(cur, sql, (list(ESTADOS_TANDA_FIRMES),))
    ordenes: List[Dict[str, Any]] = []
    for r in rows:
        cantidad = decimal_value(r["cantidad"], contexto=f"cantidad OP {r['id']}")
        peso_unit = decimal_value(r["peso_unitario_kg"], contexto=f"peso producto {r['id_producto']}")
        kg_total = cantidad * peso_unit
        kg_firmes = decimal_value(r["kg_firmes"], contexto=f"firmes OP {r['id']}", default="0")
        kg_pend = kg_total - kg_firmes
        if kg_pend <= Decimal("0.0001"):
            continue
        ordenes.append({
            "id": int(r["id"]),
            "id_producto": int(r["id_producto"]),
            "kg_pendientes": kg_pend,
            "fecha_creacion": r["fecha_creacion"],
            "fecha_entrega_solicitada": r["fecha_entrega_solicitada"],
            "prioritario": bool(r.get("prioritario")) if "prioritario" in r else False,
        })
    return ordenes


def ordenar_ordenes(ordenes: List[Dict[str, Any]]) -> None:
    """ordena OP por due date y luego prioritario; empata con antigüedad (EDD + prioridad + FIFO)."""
    def key_fn(item: Dict[str, Any]) -> Tuple[Any, int, Any, int]:
        due = item["fecha_entrega_solicitada"]
        due_key = due if isinstance(due, datetime) else datetime.max.replace(tzinfo=timezone.utc)
        prio = 0 if item.get("prioritario") else 1  # prioritario=True primero
        return (due_key, prio, item["fecha_creacion"], item["id"])
    ordenes.sort(key=key_fn)


def seleccionar_linea(lineas_compatibles: List[int], disponibilidad: Dict[int, Dict[str, Any]]) -> Optional[int]:
    """elige la línea compatible más libre (menor secuencia y carga acumulada)."""
    candidatas = [l for l in lineas_compatibles if l in disponibilidad]
    if not candidatas:
        return None
    candidatas.sort(key=lambda l: (disponibilidad[l]["sec"], disponibilidad[l]["carga_planificada"], l))
    return candidatas[0]


def insertar_tanda(cur, orden_id: int, linea_id: int, kg: Decimal, secuencia: int) -> None:
    """inserta tanda con estado 'planificada' para OP/línea dadas."""
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
    """orquesta la heurística greedy para crear tandas 'planificada'."""
    limpiar_tandas_planificadas(cur)
    lineas = obtener_lineas_activas(cur)
    compat = obtener_compatibilidades(cur)
    secuencias = obtener_secuencias_existentes(cur)
    ordenes = obtener_ordenes_pendientes(cur)
    if not ordenes:
        logger.info("No hay OP con kilos pendientes para planificar.")
        return {"nuevas_tandas": 0, "ordenes_planificadas": [], "alertas": []}
    ordenar_ordenes(ordenes)
    disponibilidad = {
        linea_id: {"capacidad": data["capacidad"], "sec": secuencias.get(linea_id, 0) + 1, "carga_planificada": Decimal("0")}
        for linea_id, data in lineas.items()
    }
    total_tandas = 0
    ordenes_planificadas: List[Dict[str, Any]] = []
    alertas: List[Dict[str, Any]] = []
    for orden in ordenes:
        orden_id = orden["id"]
        kg_pend = orden["kg_pendientes"]
        lineas_comp = compat.get(orden["id_producto"], [])
        if not lineas_comp:
            alertas.append({"orden_id": orden_id, "motivo": "sin_linea_compatible"})
            continue
        kg_rest = kg_pend
        tandas_creadas = 0
        while kg_rest > Decimal("0"):
            linea_id = seleccionar_linea(lineas_comp, disponibilidad)
            if linea_id is None:
                alertas.append({"orden_id": orden_id, "motivo": "sin_linea_disponible", "kg_pendientes": float(kg_rest)})
                break
            capacidad_linea = disponibilidad[linea_id]["capacidad"]
            if capacidad_linea <= Decimal("0"):
                alertas.append({"orden_id": orden_id, "motivo": "capacidad_no_valida", "linea_id": linea_id})
                break
            kg_tanda = kg_rest if kg_rest <= capacidad_linea else capacidad_linea
            secuencia = disponibilidad[linea_id]["sec"]
            insertar_tanda(cur, orden_id, linea_id, kg_tanda, secuencia)
            disponibilidad[linea_id]["sec"] += 1
            disponibilidad[linea_id]["carga_planificada"] += kg_tanda
            kg_rest -= kg_tanda
            tandas_creadas += 1
            total_tandas += 1
        if kg_rest <= Decimal("0"):
            ordenes_planificadas.append({"orden_id": orden_id, "tandas_creadas": tandas_creadas, "kg_total": float(kg_pend)})
    return {"nuevas_tandas": total_tandas, "ordenes_planificadas": ordenes_planificadas, "alertas": alertas}


# ---- Preview por días hábiles ----

def _siguiente_habil(d: datetime) -> datetime:
    """avanza al próximo día hábil si d es sábado/domingo."""
    while d.weekday() >= 5:
        d = d + timedelta(days=1)
    return d


def _generar_dias_habiles(desde: Optional[str], dias: int) -> List[str]:
    """construye N fechas hábiles (YYYY-MM-DD) desde 'desde' o desde hoy (hora AR)."""
    # Hora de Argentina (America/Argentina/Buenos_Aires). Si no hay zoneinfo, usar UTC-3 fijo.
    if ZoneInfo is not None:
        now_local = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    else:
        now_local = datetime.now(timezone(timedelta(hours=-3)))
    base = now_local
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


def _capacidades_diarias(cur) -> Dict[int, Decimal]:
    """capacidad por línea para 1 día (cap_linea * factor env)."""
    lineas = obtener_lineas_activas(cur)
    caps: Dict[int, Decimal] = {}
    for lid, meta in lineas.items():
        caps[lid] = meta["capacidad"] * Decimal(str(CAPACIDAD_DIARIA_FACTOR))
    return caps


def _capturar_tandas_sombra(cur) -> List[Dict[str, Any]]:
    """ejecuta planificar(cur) y lee tandas 'planificada' generadas en la misma tx."""
    resumen = planificar(cur)
    logger.info("[preview] Resumen sombra: %s", resumen)
    filas = fetch_all(
        cur,
        f"""
            SELECT t.id, t.orden_produccion_id, t.linea_produccion_id, t.cantidad_kg,
                   op.id_orden_venta, op.id_producto, p.nombre AS producto,
                   ov.fecha_entrega_solicitada,
                   t.secuencia_en_linea
            FROM {ENV}.tanda_produccion t
            JOIN {ENV}.orden_produccion op ON op.id = t.orden_produccion_id
            JOIN {ENV}.producto p ON p.id = op.id_producto
            LEFT JOIN {ENV}.orden_venta ov ON ov.id = op.id_orden_venta
            WHERE t.estado = 'planificada'
            ORDER BY t.linea_produccion_id, t.secuencia_en_linea, t.id
        """,
    )
    logger.info("[preview] Tandas capturadas: %s", len(filas))
    return filas


def _estado_pedido(fecha_plan: str, fecha_entrega: Optional[datetime]) -> str:
    """clasifica la OP según fecha planificada vs fecha_entrega_solicitada."""
    if not fecha_entrega:
        return "en_tiempo"
    try:
        fp = datetime.fromisoformat(fecha_plan).date()
    except Exception:
        return "en_tiempo"
    if isinstance(fecha_entrega, datetime):
        fe = fecha_entrega.date()
    elif isinstance(fecha_entrega, date):
        fe = fecha_entrega
    else:
        return "en_tiempo"
    diff = (fe - fp).days
    if diff < 0:
        return "atrasado"
    if diff == 1:
        return "por_vencer"
    return "en_tiempo"


def _bucket_por_dias(
    tandas: List[Dict[str, Any]],
    dias: List[str],
    caps_dia: Dict[int, Decimal],
) -> List[Dict[str, List[Dict[str, Any]]]]:
    """distribuye tandas por fecha (L–V) y clasifica estado_pedido por OP, con dedupe intra-día."""
    restante: List[Dict[int, Decimal]] = [{lid: Decimal(v) for lid, v in caps_dia.items()} for _ in dias]
    agenda: List[Dict[str, List[Dict[str, Any]]]] = [{d: []} for d in dias]
    vistos_por_dia: List[set] = [set() for _ in dias]

    for t in tandas:
        lid = int(t["linea_produccion_id"])
        op_id = int(t["orden_produccion_id"])
        kg = decimal_value(t["cantidad_kg"], f"kg tanda {t['id']}")
        due = t.get("fecha_entrega_solicitada")

        colocado = False
        for i, d in enumerate(dias):
            disp = restante[i].get(lid, Decimal("0"))
            if disp >= kg:
                if op_id not in vistos_por_dia[i]:
                    estado = _estado_pedido(d, due)
                    agenda[i][d].append({
                        "estado_pedido": estado,
                        "id_orden_produccion": op_id,
                    })
                    vistos_por_dia[i].add(op_id)
                restante[i][lid] = disp - kg
                colocado = True
                break
        if not colocado:
            logger.warning("[preview] Sin capacidad en %s días para tanda %s (línea %s, kg=%s)", len(dias), t["id"], lid, kg)
    return agenda


def _next_business_date(d: date) -> date:
    """devuelve el siguiente día hábil a partir de d."""
    nd = d + timedelta(days=1)
    while nd.weekday() >= 5:
        nd += timedelta(days=1)
    return nd


def _bucket_sin_limite(tandas: List[Dict[str, Any]], caps_dia: Dict[int, Decimal], base: date) -> List[Dict[str, List[Dict[str, Any]]]]:
    """distribuye tandas creando días hábiles sucesivos hasta colocar todas (sin límite)."""
    # Guardas: si alguna línea tiene capacidad diaria <= 0, sus tandas no podrán colocarse.
    agenda: List[Dict[str, List[Dict[str, Any]]]] = []
    dias: List[str] = []
    restante: List[Dict[int, Decimal]] = []
    vistos_por_dia: List[set] = []

    def add_day(first: bool = False):
        nonlocal base
        if not first:
            base = _next_business_date(base)
        # Fecha como string ISO YYYY-MM-DD
        d_str = base.isoformat()
        dias.append(d_str)
        restante.append({lid: Decimal(v) for lid, v in caps_dia.items()})
        vistos_por_dia.append(set())
        agenda.append({d_str: []})

    # Inicializamos con el primer día hábil desde hoy
    add_day(first=True)

    for t in tandas:
        lid = int(t["linea_produccion_id"])
        op_id = int(t["orden_produccion_id"])
        kg = decimal_value(t["cantidad_kg"], f"kg tanda {t['id']}")
        due = t.get("fecha_entrega_solicitada")

        # Protección: capacidad diaria de la línea debe ser > 0
        cap_linea_dia = caps_dia.get(lid, Decimal("0"))
        if cap_linea_dia <= Decimal("0"):
            logger.warning("[preview] Línea %s con capacidad diaria 0; omitiendo tanda %s (kg=%s)", lid, t["id"], kg)
            continue

        colocado = False
        while not colocado:
            # Intentar en días existentes
            for i, d_str in enumerate(dias):
                disp = restante[i].get(lid, Decimal("0"))
                if disp >= kg:
                    if op_id not in vistos_por_dia[i]:
                        estado = _estado_pedido(d_str, due)
                        agenda[i][d_str].append({
                            "estado_pedido": estado,
                            "id_orden_produccion": op_id,
                        })
                        vistos_por_dia[i].add(op_id)
                    restante[i][lid] = disp - kg
                    colocado = True
                    break
            if not colocado:
                # Crear un nuevo día hábil y reintentar
                add_day()

    return agenda


def preview_sin_limite(cur) -> List[Dict[str, List[Dict[str, Any]]]]:
    """orquesta sombra + capacidades y retorna agenda en días hábiles sin límite."""
    tandas = _capturar_tandas_sombra(cur)
    caps = _capacidades_diarias(cur)
    # Base: hoy en AR (o UTC-3) movido al próximo hábil
    if ZoneInfo is not None:
        now_local = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    else:
        now_local = datetime.now(timezone(timedelta(hours=-3)))
    base_dt = _siguiente_habil(now_local)
    base = base_dt.date()
    agenda = _bucket_sin_limite(tandas, caps, base)
    return agenda


def parse_event(event: Any) -> Dict[str, Any]:
    """normaliza el evento de entrada (APIGW body o dict plano)."""
    if not event:
        return {}
    if isinstance(event, dict) and "body" in event:
        body = event["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                raise PlanningError("Payload inválido")
        if isinstance(body, dict):
            return body
    if isinstance(event, dict):
        return event
    raise PlanningError("Evento no soportado")


def lambda_handler(event, context):
    """entrypoint de preview; ejecuta sombra y rollback, no persiste."""
    logger.info("Preview diario - evento: %s", event)
    try:
        payload = parse_event(event)
    except PlanningError as exc:
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(exc)})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        agenda = preview_sin_limite(cur)
        # Persistimos la planificación efímera en una nueva conexión (TRUNCATE + INSERT + COMMIT)
        try:
            total = guardar_planificacion(agenda)
            logger.info("[preview] planificacion_diaria regenerada: %s filas", total)
        except Exception:
            logger.exception("No se pudo persistir planificacion_diaria")
            # No abortamos la respuesta; la preview sigue siendo válida
        conn.rollback()  # sombra: garantizamos no persistir tandas ni efectos colaterales
        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(agenda)}
    except PlanningError as exc:
        if conn:
            conn.rollback()
        logger.warning("Preview interrumpida: %s", exc)
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(exc)})}
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Error inesperado en preview diario")
        return {"statusCode": 500, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}
    finally:
        if conn:
            conn.close()


def guardar_planificacion(agenda: List[Dict[str, List[Dict[str, Any]]]]) -> int:
    """TRUNCATE + INSERT en {ENV}.planificacion_diaria usando una conexión separada."""
    cfg_conn = get_connection()
    try:
        cur2 = cfg_conn.cursor()
        cur2.execute(f"TRUNCATE TABLE {ENV}.planificacion_diaria")
        insert_sql = f"INSERT INTO {ENV}.planificacion_diaria (fecha, id_orden_produccion) VALUES (%s, %s)"
        total = 0
        for item in agenda:
            fecha = next(iter(item))
            filas = item[fecha]
            for fila in filas:
                cur2.execute(insert_sql, (fecha, int(fila["id_orden_produccion"])))
                total += 1
        cfg_conn.commit()
        return total
    finally:
        cfg_conn.close()

