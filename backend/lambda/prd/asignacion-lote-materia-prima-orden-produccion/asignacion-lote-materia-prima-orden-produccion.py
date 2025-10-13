import json
import logging
import os
import ssl
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

import boto3
import pg8000

# --- Configuración Estándar ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG: Optional[Dict[str, Any]] = None


class ValidationError(Exception):
    """Errores de negocio en la asignacion de materia prima."""


# --- Funciones de Conexión y BD ---
# (Aquí van todas tus funciones de base de datos sin cambios:
# get_db_parameters, get_connection, fetch_all, delete_existing_assignments,
# decimal_value, obtener_ordenes, requerimientos_por_producto,
# consumos_asignados, lotes_disponibles, y asignar_materia)

# ... (Copiá y pegá aquí todas las funciones desde tu versión anterior) ...
# Por brevedad, solo incluyo el lambda_handler modificado. Asegúrate de tener
# todas las demás funciones en tu archivo.

def get_db_parameters() -> Dict[str, Any]:
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG
    names = [
        "/alimentapp/db/host", "/alimentapp/db/password",
        "/alimentapp/db/port", "/alimentapp/db/username",
    ]
    resp = ssm_client.get_parameters(Names=names, WithDecryption=True)
    if len(resp["Parameters"]) != len(names):
        missing = set(names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Faltan parametros en SSM: {', '.join(sorted(missing))}")
    data = {p["Name"].split("/")[-1]: p["Value"] for p in resp["Parameters"]}
    DB_CONFIG = {
        "host": data["host"], "port": int(data.get("port", "5432")),
        "user": data["username"], "password": data["password"],
        "database": os.getenv("DB_NAME", "postgres"),
    }
    return DB_CONFIG

def get_connection():
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"], port=cfg["port"], database=cfg["database"],
        user=cfg["user"], password=cfg["password"],
        ssl_context=ssl.create_default_context(), timeout=10,
    )

def fetch_all(cur, sql: str, params: Iterable[Any] = None) -> List[Dict[str, Any]]:
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]

def delete_existing_assignments(cur, orden_ids: List[int]):
    if not orden_ids:
        return
    logger.info(f"Limpiando asignaciones previas para las órdenes de producción: {orden_ids}")
    sql = f"DELETE FROM {ENV}.materia_prima_por_orden_produccion WHERE id_orden_produccion = ANY(%s)"
    cur.execute(sql, (orden_ids,))
    logger.info(f"Se limpiaron {cur.rowcount} asignaciones existentes.")

def decimal_value(value: Any) -> Decimal:
    return Decimal(str(value))

def obtener_ordenes(cur, ids: Optional[List[int]], limit: Optional[int]) -> List[Dict[str, Any]]:
    if ids:
        sql = f"SELECT id, id_producto, cantidad, estado FROM {ENV}.orden_produccion WHERE id = ANY(%s)"
        ordenes = fetch_all(cur, sql, (ids,))
    else:
        sql = f"SELECT id, id_producto, cantidad, estado FROM {ENV}.orden_produccion WHERE estado IN ('pendiente', 'planificada') ORDER BY fecha_creacion, id LIMIT %s"
        ordenes = fetch_all(cur, sql, (limit or 50,))
    if not ordenes:
        raise ValidationError("No se encontraron órdenes de producción para asignar.")
    return ordenes

def requerimientos_por_producto(cur, product_id: int) -> List[Dict[str, Any]]:
    sql = f"SELECT id_materia_prima, cantidad_unitaria FROM {ENV}.materia_prima_por_producto WHERE id_producto = %s"
    filas = fetch_all(cur, sql, (product_id,))
    if not filas:
        raise ValidationError(f"El producto {product_id} no tiene receta definida.")
    return filas

def consumos_asignados(cur, orden_id: int) -> Dict[int, Decimal]:
    sql = f"SELECT lmp.id_materia_prima, SUM(mpop.cantidad_utilizada) AS total FROM {ENV}.materia_prima_por_orden_produccion mpop JOIN {ENV}.lote_materia_prima lmp ON lmp.id = mpop.id_lote_materia_prima WHERE mpop.id_orden_produccion = %s GROUP BY lmp.id_materia_prima"
    rows = fetch_all(cur, sql, (orden_id,))
    return {int(r["id_materia_prima"]): decimal_value(r["total"]) for r in rows}

def lotes_disponibles(cur, materia_id: int, fecha_corte: datetime) -> List[Dict[str, Any]]:
    sql = f"""
        SELECT id, cantidad_unitaria_disponible
        FROM {ENV}.lote_materia_prima
        WHERE id_materia_prima = %s
          AND estado = 'disponible' AND cantidad_unitaria_disponible > 0
          AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= %s)
        ORDER BY fecha_vencimiento NULLS LAST, id
        FOR UPDATE
    """
    return fetch_all(cur, sql, (materia_id, fecha_corte))

def asignar_materia(cur, orden: Dict[str, Any], fecha_corte: datetime) -> Dict[str, Any]:
    orden_id = int(orden["id"])
    logger.info(f"--- Iniciando asignación para Orden de Producción ID: {orden_id} ---")
    
    producto_id = int(orden["id_producto"])
    cantidad = Decimal(str(orden["cantidad"]))
    if cantidad <= 0:
        logger.warning(f"Orden {orden_id} tiene cantidad 0 o negativa. Se omite.")
        return {"id": orden_id, "estado": "sin_cantidad"}

    receta = requerimientos_por_producto(cur, producto_id)
    ya_asignado = consumos_asignados(cur, orden_id)

    resultado = {"id": orden_id, "asignaciones": [], "faltantes": []}
    completa = True

    for item in receta:
        materia_id = int(item["id_materia_prima"])
        por_unidad = decimal_value(item["cantidad_unitaria"])
        requerido = cantidad * por_unidad
        asignado = ya_asignado.get(materia_id, Decimal("0"))
        faltante = requerido - asignado
        
        logger.info(f"Orden {orden_id} - Materia Prima {materia_id}: Requiere {requerido}, ya tiene {asignado}, falta asignar {faltante}.")

        if faltante <= 0:
            continue

        lotes = lotes_disponibles(cur, materia_id, fecha_corte)
        restante = faltante
        for lote in lotes:
            if restante <= 0: break
            
            lote_id = int(lote["id"])
            disponible = decimal_value(lote["cantidad_unitaria_disponible"])
            if disponible <= 0: continue
            
            usar = min(disponible, restante)
            logger.info(f"Orden {orden_id} - Asignando {usar} de MP {materia_id} desde Lote {lote_id} (disponible: {disponible})")

            cur.execute(
                f"INSERT INTO {ENV}.materia_prima_por_orden_produccion (id_lote_materia_prima, id_orden_produccion, cantidad_utilizada) VALUES (%s, %s, %s)",
                (lote_id, orden_id, usar),
            )
            nuevo_disponible = disponible - usar
            nuevo_estado = 'agotado' if nuevo_disponible <= 0 else 'disponible'
            cur.execute(
                f"UPDATE {ENV}.lote_materia_prima SET cantidad_unitaria_disponible = %s, estado = %s WHERE id = %s",
                (nuevo_disponible, nuevo_estado, lote_id),
            )
            restante -= usar
            resultado["asignaciones"].append({
                "id_materia_prima": materia_id, "id_lote": lote_id, "cantidad_utilizada": float(usar)
            })

        if restante > 0:
            completa = False
            logger.warning(f"Orden {orden_id} - Faltante de {restante} para MP {materia_id} después de revisar todos los lotes.")
            resultado["faltantes"].append({
                "id_materia_prima": materia_id, "faltante": float(restante)
            })

    if completa:
        logger.info(f"Orden {orden_id} - Asignación completa. Cambiando estado a 'lista_para_produccion'.")
        cur.execute(
            f"""
            UPDATE {ENV}.orden_produccion
            SET estado = 'lista_para_produccion'
            WHERE id = %s AND estado IN ('pendiente','planificada')
            """,
            (orden_id,),
        )
        resultado["estado_final"] = "lista_para_produccion"
    else:
        logger.warning(f"Orden {orden_id} - Asignación INCOMPLETA. Estado no modificado: {orden['estado']}.")
        resultado["estado_final"] = orden["estado"]

    return resultado

# --- Handler Principal (MODIFICADO CON RESUMEN) ---
def lambda_handler(event, context):
    logger.info("Iniciando asignación de lotes de materia prima. Evento: %s", event)

    try:
        payload = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else (event or {})
    except json.JSONDecodeError as exc:
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": f"Payload invalido: {exc}"})}

    ids = payload.get("ordenes_produccion")
    limit = payload.get("limite")
    id_list = None
    if ids is not None:
        try:
            id_list = [int(i) for i in ids]
        except (TypeError, ValueError):
            return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "ordenes_produccion debe ser una lista de enteros"})}

    fecha_corte = datetime.now(timezone.utc) + timedelta(days=14)

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        ordenes = obtener_ordenes(cur, id_list, int(limit) if limit else None)
        logger.info(f"Se procesarán {len(ordenes)} órdenes de producción: {[o['id'] for o in ordenes]}")
        
        delete_existing_assignments(cur, [o["id"] for o in ordenes])

        resultados: List[Dict[str, Any]] = []
        for orden in ordenes:
            resultados.append(asignar_materia(cur, orden, fecha_corte))

        conn.commit()
        logger.info("Transacción completada y confirmada (commit).")

        # --- INICIO DEL NUEVO BLOQUE DE RESUMEN DESCRIPTIVO ---
        logger.info("=" * 60)
        logger.info("📋 RESUMEN DE LA ASIGNACIÓN")
        logger.info("=" * 60)

        ordenes_completadas = [res["id"] for res in resultados if res.get("estado_final") == "lista_para_produccion"]
        ordenes_incompletas = [res["id"] for res in resultados if res.get("estado_final") != "lista_para_produccion"]

        logger.info(f"Total de órdenes procesadas: {len(resultados)}")
        
        logger.info(f"✅ Órdenes completadas y listas para producción: {len(ordenes_completadas)}")
        if ordenes_completadas:
            logger.info(f"   IDs: {ordenes_completadas}")

        logger.info(f"⚠️ Órdenes que quedaron incompletas (sin stock): {len(ordenes_incompletas)}")
        if ordenes_incompletas:
            logger.info(f"   IDs: {ordenes_incompletas}")
            # Opcional: Mostrar detalles de por qué fallaron
            for res in resultados:
                if res["id"] in ordenes_incompletas:
                    logger.warning(f"   -> Detalle Orden {res['id']}: Faltantes reportados: {res['faltantes']}")
        
        logger.info("=" * 60)
        # --- FIN DEL BLOQUE DE RESUMEN ---

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"resultados": resultados}),
        }
    except ValidationError as exc:
        if conn: conn.rollback()
        logger.warning("Validación fallida: %s", exc)
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(exc)})}
    except Exception as exc:
        if conn: conn.rollback()
        logger.exception("Error inesperado asignando materia prima")
        return {"statusCode": 500, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": "Error interno", "detail": str(exc)})}
    finally:
        if conn:
            conn.close()