"""Lambda simulación OV: evalúa impacto de una orden_venta existente sin persistir.

Flujo:
- Invoca la Lambda diaria para obtener el baseline de estados (agenda y atrasados).
- Cambia temporalmente OP de la OV dada a 'lista_para_produccion' (si no lo están) y commit.
- Invoca nuevamente la Lambda diaria y compara OP atrasadas nuevas (excluye OP de la OV).
- Revierte estados originales y vuelve a invocar la Lambda diaria para restaurar planificacion_diaria.
"""

import json
import logging
import os
import ssl
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
# ARN de la Lambda diaria (hardcodeado por requerimiento)
PLANNER_DAILY_FN = "arn:aws:lambda:us-east-1:554074173959:function:planificador_ordenes_produccion_daily"

ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG: Optional[Dict[str, Any]] = None


class SimulationError(Exception):
    """Errores funcionales durante la simulación de impacto."""


def get_db_parameters() -> Dict[str, Any]:
    """Lee credenciales de RDS desde SSM y las cachea en memoria."""
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
        raise SimulationError(f"Faltan parámetros en SSM: {', '.join(sorted(missing))}")
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
    """Abre una conexión pg8000 con SSL y timeout."""
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
    """Ejecuta SELECT y devuelve lista de dicts (columns → values)."""
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def parse_event(event: Any) -> Dict[str, Any]:
    """Normaliza el evento de entrada (GET query o body JSON)."""
    if not event:
        return {}
    # API Gateway v2
    if isinstance(event, dict) and event.get("queryStringParameters") is not None:
        return event["queryStringParameters"] or {}
    # API Gateway v1
    if isinstance(event, dict) and event.get("multiValueQueryStringParameters") is not None:
        params = event["multiValueQueryStringParameters"] or {}
        return {k: (v[0] if isinstance(v, list) and v else v) for k, v in params.items()}
    # Body JSON
    if isinstance(event, dict) and "body" in event:
        body = event["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                raise SimulationError("Payload inválido")
        if isinstance(body, dict):
            return body
    if isinstance(event, dict):
        return event
    raise SimulationError("Evento no soportado")


def invoke_daily_agenda() -> List[Dict[str, List[Dict[str, Any]]]]:
    """Invoca la Lambda diaria y devuelve la agenda parseada (lista de objetos por fecha)."""
    if not PLANNER_DAILY_FN:
        raise SimulationError("Falta env var PLANNER_DAILY_FN")
    resp = lambda_client.invoke(FunctionName=PLANNER_DAILY_FN, InvocationType="RequestResponse", Payload=json.dumps({}).encode("utf-8"))
    payload = resp.get("Payload")
    raw = payload.read() if payload else b"{}"
    try:
        outer = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        logger.exception("No se pudo decodificar respuesta de Lambda diaria")
        raise SimulationError("Respuesta inválida de planificador diario") from exc
    body = outer.get("body")
    if isinstance(body, str):
        return json.loads(body)
    if isinstance(body, list):
        return body
    raise SimulationError("Estructura de respuesta inesperada del planificador")


def extract_atrasados(agenda: List[Dict[str, List[Dict[str, Any]]]]) -> Set[int]:
    """Construye el set de OP que aparecen con estado_pedido = 'atrasado' en cualquier día."""
    out: Set[int] = set()
    for item in agenda:
        if not item:
            continue
        fecha = next(iter(item))
        filas = item.get(fecha) or []
        for fila in filas:
            try:
                if fila.get("estado_pedido") == "atrasado":
                    out.add(int(fila.get("id_orden_produccion")))
            except Exception:
                continue
    return out


def op_ids_por_ov(cur, ov_id: int) -> List[int]:
    """Obtiene los IDs de OP asociadas a la orden_venta dada."""
    rows = fetch_all(cur, f"SELECT id FROM {ENV}.orden_produccion WHERE id_orden_venta = %s", (ov_id,))
    return [int(r["id"]) for r in rows]


def estados_por_op(cur, op_ids: List[int]) -> Dict[int, str]:
    """Devuelve estado actual por OP para las OP indicadas."""
    if not op_ids:
        return {}
    sql = f"SELECT id, estado FROM {ENV}.orden_produccion WHERE id = ANY(%s)"
    rows = fetch_all(cur, sql, (op_ids,))
    return {int(r["id"]): str(r["estado"]) for r in rows}


def setear_lista_para_produccion(cur, op_ids: List[int]) -> int:
    """Actualiza a 'lista_para_produccion' las OP indicadas y retorna filas afectadas."""
    if not op_ids:
        return 0
    sql = f"UPDATE {ENV}.orden_produccion SET estado = 'lista_para_produccion' WHERE id = ANY(%s)"
    cur.execute(sql, (op_ids,))
    return cur.rowcount


def revertir_estados(cur, originales: Dict[int, str]) -> int:
    """Restaura estados originales de OP (puede ejecutar en lotes)."""
    if not originales:
        return 0
    total = 0
    # Ejecutamos por estado para minimizar roundtrips
    por_estado: Dict[str, List[int]] = {}
    for op_id, est in originales.items():
        por_estado.setdefault(est, []).append(op_id)
    for est, ids in por_estado.items():
        sql = f"UPDATE {ENV}.orden_produccion SET estado = %s WHERE id = ANY(%s)"
        cur.execute(sql, (est, ids))
        total += cur.rowcount
    return total


def build_date_map(agenda: List[Dict[str, List[Dict[str, Any]]]]) -> Dict[int, str]:
    """Creates a mapping from id_orden_produccion to its planned date string."""
    date_map = {}
    for daily_plan in agenda:
        if not daily_plan:
            continue
        for date_str, ops in daily_plan.items():
            for op in ops:
                try:
                    op_id = int(op.get("id_orden_produccion"))
                    if op_id:
                        date_map[op_id] = date_str
                except (ValueError, TypeError):
                    continue
    return date_map


def lambda_handler(event, context):
    """Entry de simulación: compara atrasados antes y después de sumar OP de una OV (GET id_orden_venta)."""
    logger.info("Simulación OV - evento: %s", event)
    try:
        payload = parse_event(event)
        ov_id_raw = (payload or {}).get("id_orden_venta")
        if ov_id_raw is None:
            return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "Falta 'id_orden_venta'"})}
        ov_id = int(ov_id_raw)
    except (SimulationError, ValueError) as exc:
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(exc)})}

    # 1) Baseline de atrasados
    try:
        agenda_base = invoke_daily_agenda()
        atrasados_base = extract_atrasados(agenda_base)
        original_dates = build_date_map(agenda_base) # Fecha original de cada OP
        logger.info("Baseline atrasados: %s OP", len(atrasados_base))
    except SimulationError as exc:
        return {"statusCode": 502, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": f"Planificador diario: {str(exc)}"})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # OP de la OV
        op_ids = op_ids_por_ov(cur, ov_id)
        if not op_ids:
            return {"statusCode": 404, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "OV sin OP asociadas"})}

        # Estados originales y subset a promover a 'lista_para_produccion'
        originales = estados_por_op(cur, op_ids)
        promover = [oid for oid, est in originales.items() if est != 'lista_para_produccion']

        # 2) Promover temporalmente y commit para que el planificador las lea
        if promover:
            n = setear_lista_para_produccion(cur, promover)
            conn.commit()
            logger.info("Promovidas a lista_para_produccion: %s (afectadas=%s)", len(promover), n)
        else:
            logger.info("Todas las OP de la OV ya estaban en 'lista_para_produccion'")

        # 3) Replanificar con OV incluida
        agenda_new = invoke_daily_agenda()
        atrasados_new = extract_atrasados(agenda_new)
        new_dates = build_date_map(agenda_new) # Nueva fecha de cada OP

        # 4) Calcular afectadas (nuevas atrasadas), excluyendo OP de la OV
        afectadas_ids = sorted(list((atrasados_new - atrasados_base) - set(op_ids)))

        # 5) Enriquecer la respuesta con las fechas
        afectadas_con_detalle = []
        for op_id in afectadas_ids:
            afectadas_con_detalle.append({
                "id_orden_produccion": op_id,
                "fecha_planificada_original": original_dates.get(op_id, "N/A"),
                "fecha_planificada_nueva": new_dates.get(op_id, "N/A")
            })

        # 6) Revertir estados y restaurar planificacion_diaria
        if promover:
            r = revertir_estados(cur, {oid: originales[oid] for oid in promover})
            conn.commit()
            logger.info("Revertidos estados originales: %s", r)

        # Restaurar planificacion_diaria acorde al estado real
        try:
            _ = invoke_daily_agenda()
        except Exception:
            logger.warning("No se pudo regenerar planificacion_diaria al final de la simulación")

        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"ordenes_afectadas": afectadas_con_detalle})}

    except Exception as exc:
        logger.exception("Error en simulación OV")
        # En caso de error, intentar revertir cambios locales
        try:
            if conn:
                conn.rollback()
        except Exception:
            pass
        return {"statusCode": 500, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}
    finally:
        if conn:
            conn.close()
