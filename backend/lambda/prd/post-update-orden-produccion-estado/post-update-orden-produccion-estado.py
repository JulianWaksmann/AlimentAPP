import json
import logging
import os
import ssl
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional, Tuple

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
lambda_client = boto3.client("lambda")

DB_CONFIG: Optional[Dict[str, Any]] = None
SSL_CONTEXT = ssl.create_default_context()

PLANIFICADOR_ARN = "arn:aws:lambda:us-east-1:554074173959:function:planificador_ordenes_produccion"

ESTADOS_VALIDOS = {"en_progreso", "completada", "cancelada"}
TRANSICIONES = {
    "planificada": {"en_progreso", "completada", "cancelada"},
    "en_progreso": {"completada", "cancelada"},
    "completada": set(),
    "cancelada": set(),
}


class ValidationError(Exception):
    """Errores de validación para el cambio de estado de tandas."""
    # Representa fallos de reglas de negocio en el request.


def get_db_parameters() -> Dict[str, Any]:
    """Obtiene credenciales de RDS desde SSM (cacheadas)."""
    # Recupera y cachea los parámetros de conexión.
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
        raise RuntimeError(f"Faltan parámetros en SSM: {', '.join(sorted(missing))}")
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
    """Construye una conexión pg8000 con SSL."""
    # Abre una conexión nueva hacia la base de datos.
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=SSL_CONTEXT,
        timeout=10,
    )


def fetch_all(cur, sql: str, params: Iterable[Any] = None) -> List[Dict[str, Any]]:
    """Ejecuta un SELECT y devuelve filas como diccionarios."""
    # Ejecuta la consulta y transforma el resultado en lista de dicts.
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str, params: Iterable[Any] = None) -> None:
    """Ejecuta un comando DML (INSERT/UPDATE/DELETE)."""
    # Lanza la consulta con parámetros posicionados.
    cur.execute(sql, tuple(params or ()))


def decimal_value(value: Any, contexto: str) -> Decimal:
    """Normaliza valores numéricos a Decimal con mensajes claros."""
    # Convierte valores a Decimal y controla errores de formato.
    if value is None:
        raise ValidationError(f"{contexto} ausente")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"{contexto} inválido: {value}")


def validate_payload(payload: Dict[str, Any]) -> Tuple[List[int], str]:
    """Valida que existan ids y estado destino correctos."""
    # Revisa estructura del JSON recibido.
    if not isinstance(payload, dict):
        raise ValidationError("El cuerpo debe ser un objeto JSON.")

    ids = payload.get("id_tandas")
    estado = payload.get("estado")

    if not isinstance(ids, list) or not ids:
        raise ValidationError("`id_tandas` debe ser una lista no vacía de enteros.")

    try:
        id_list = [int(i) for i in ids]
    except (ValueError, TypeError):
        raise ValidationError("Todos los valores de `id_tandas` deben ser enteros.")

    if estado not in ESTADOS_VALIDOS:
        raise ValidationError(f"Estado destino inválido: {estado}. Valores permitidos: {', '.join(sorted(ESTADOS_VALIDOS))}")

    return id_list, estado  # Retorna IDs y estado destino.


def obtener_tandas(cur, ids: List[int]) -> List[Dict[str, Any]]:
    """Trae tandas para los ids indicados y bloquea filas para update."""
    # Selecciona tandas con FOR UPDATE para evitar carreras.
    sql = f"""
        SELECT id, orden_produccion_id, linea_produccion_id, estado, cantidad_kg
        FROM {ENV}.tanda_produccion
        WHERE id = ANY(%s)
        FOR UPDATE
    """
    tandas = fetch_all(cur, sql, (ids,))
    if len(tandas) != len(ids):
        encontrados = {int(t["id"]) for t in tandas}
        faltantes = [str(i) for i in ids if i not in encontrados]
        raise ValidationError(f"Tandas inexistentes: {', '.join(faltantes)}")
    return tandas  # Devuelve todas las tandas bloqueadas.


def validar_transiciones(tandas: List[Dict[str, Any]], destino: str) -> None:
    """Verifica que cada tanda permita el cambio al estado destino."""
    # Comprueba reglas de transición por estado actual.
    for tanda in tandas:
        actual = tanda["estado"]
        permitidos = TRANSICIONES.get(actual, set())
        if destino == actual:
            raise ValidationError(f"La tanda {tanda['id']} ya está en estado {destino}.")
        if destino not in permitidos:
            raise ValidationError(f"No se puede pasar la tanda {tanda['id']} de {actual} a {destino}.")


def actualizar_lineas(cur, lineas_afectadas: Dict[int, str]) -> None:
    """Actualiza el flag de actividad de las líneas según las tandas."""
    # Determina si cada línea queda ocupada o libre tras la operación.
    for linea_id, nuevo_estado in lineas_afectadas.items():
        if nuevo_estado == "ocupar":
            run_command(
                cur,
                f"UPDATE {ENV}.linea_produccion SET activa = FALSE WHERE id = %s",
                (linea_id,),
            )
        elif nuevo_estado == "liberar":
            sql = f"""
                SELECT COUNT(*) AS en_progreso
                FROM {ENV}.tanda_produccion
                WHERE linea_produccion_id = %s AND estado = 'en_progreso'
            """
            registros = fetch_all(cur, sql, (linea_id,))
            if registros and int(registros[0]["en_progreso"]) == 0:
                run_command(
                    cur,
                    f"UPDATE {ENV}.linea_produccion SET activa = TRUE WHERE id = %s",
                    (linea_id,),
                )


def actualizar_ordenes(cur, orden_ids: List[int]) -> List[Dict[str, Any]]:
    """Recalcula el estado lógico de las órdenes impactadas."""
    # Evalúa kilos firmes y decide estado objetivo por orden.
    resultados: List[Dict[str, Any]] = []
    for order_id in orden_ids:
        detalle = fetch_all(
            cur,
            f"""
                SELECT
                    op.estado,
                    op.cantidad,
                    p.peso_unitario_kg
                FROM {ENV}.orden_produccion op
                JOIN {ENV}.producto p ON p.id = op.id_producto
                WHERE op.id = %s
            """,
            (order_id,),
        )
        if not detalle:
            continue
        registro = detalle[0]
        cantidad = decimal_value(registro["cantidad"], f"cantidad de orden {order_id}")
        peso_unitario = decimal_value(registro["peso_unitario_kg"], f"peso unitario de orden {order_id}")
        estado_actual = registro["estado"]

        kg_total = cantidad * peso_unitario

        resumen = fetch_all(
            cur,
            f"""
                SELECT
                    COALESCE(SUM(CASE WHEN estado IN ('en_progreso','completada') THEN cantidad_kg ELSE 0 END), 0) AS kg_firmes,
                    SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) AS tandas_en_progreso,
                    SUM(CASE WHEN estado = 'planificada' THEN 1 ELSE 0 END) AS tandas_planificadas
                FROM {ENV}.tanda_produccion
                WHERE orden_produccion_id = %s
            """,
            (order_id,),
        )[0]

        kg_firmes = decimal_value(resumen["kg_firmes"], f"kg firmes de orden {order_id}")
        en_progreso = int(resumen["tandas_en_progreso"] or 0)
        planificadas = int(resumen["tandas_planificadas"] or 0)

        nuevo_estado = None
        if kg_firmes > Decimal("0") and estado_actual in {"planificada", "lista_para_produccion"}:
            nuevo_estado = "en_proceso"
        if kg_firmes >= kg_total and en_progreso == 0 and planificadas == 0:
            nuevo_estado = "finalizada"

        if nuevo_estado and nuevo_estado != estado_actual:
            run_command(
                cur,
                f"UPDATE {ENV}.orden_produccion SET estado = %s WHERE id = %s",
                (nuevo_estado, order_id),
            )
            resultados.append(
                {
                    "orden_id": order_id,
                    "estado_anterior": estado_actual,
                    "estado_nuevo": nuevo_estado,
                }
            )
        else:
            resultados.append(
                {
                    "orden_id": order_id,
                    "estado_anterior": estado_actual,
                    "estado_nuevo": estado_actual,
                }
            )

    return resultados  # Devuelve resumen por orden tratada.


def procesar_tandas(cur, tandas: List[Dict[str, Any]], destino: str) -> Dict[str, Any]:
    """Actualiza tandas, líneas y órdenes según el estado destino."""
    # Aplica la transición y recolecta métricas para la respuesta.
    lineas_a_marcar: Dict[int, str] = {}
    ordenes_afectadas: set[int] = set()

    for tanda in tandas:
        tanda_id = int(tanda["id"])
        orden_id = int(tanda["orden_produccion_id"])
        linea_id = int(tanda["linea_produccion_id"])

        if destino == "en_progreso":
            run_command(
                cur,
                f"UPDATE {ENV}.tanda_produccion SET estado = 'en_progreso' WHERE id = %s",
                (tanda_id,),
            )
            lineas_a_marcar[linea_id] = "ocupar"
        elif destino == "completada":
            run_command(
                cur,
                f"UPDATE {ENV}.tanda_produccion SET estado = 'completada' WHERE id = %s",
                (tanda_id,),
            )
            lineas_a_marcar[linea_id] = "liberar"
        elif destino == "cancelada":
            run_command(
                cur,
                f"UPDATE {ENV}.tanda_produccion SET estado = 'cancelada' WHERE id = %s",
                (tanda_id,),
            )
            lineas_a_marcar[linea_id] = "liberar"

        ordenes_afectadas.add(orden_id)

    actualizar_lineas(cur, lineas_a_marcar)

    resumen_ordenes = actualizar_ordenes(cur, list(ordenes_afectadas))

    return {
        "tandas_actualizadas": [int(t["id"]) for t in tandas],
        "ordenes_afectadas": resumen_ordenes,
    }  # Devuelve IDs y cambios en órdenes.


def invocar_planificador(origen: str, tandas: List[int]) -> None:
    """Dispara la lambda de planificación en modo asíncrono."""
    # Envía un evento fire-and-forget con el contexto de la operación.
    payload = {
        "source": origen,
        "tanda_ids": tandas,
    }
    try:
        lambda_client.invoke(
            FunctionName=PLANIFICADOR_ARN,
            InvocationType="Event",
            Payload=json.dumps(payload).encode("utf-8"),
        )
    except Exception as exc:  # pragma: no cover
        logger.exception("No se pudo invocar el planificador: %s", exc)


def lambda_handler(event, context):
    """Entry point HTTP para actualizar tandas de producción."""
    # Procesa el request, actualiza BD y dispara el planificador.
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
        id_tandas, estado_destino = validate_payload(payload)
        conn = get_connection()
        cur = conn.cursor()

        tandas = obtener_tandas(cur, id_tandas)
        validar_transiciones(tandas, estado_destino)

        resultado = procesar_tandas(cur, tandas, estado_destino)

        conn.commit()

        invocar_planificador(f"tanda:{estado_destino}", resultado["tandas_actualizadas"])

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "message": f"Tandas actualizadas a {estado_destino}",
                    "tandas": resultado["tandas_actualizadas"],
                    "ordenes": resultado["ordenes_afectadas"],
                }
            ),
        }
    except ValidationError as exc:
        if conn:
            conn.rollback()
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": str(exc)}),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo inesperado actualizando tandas")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()