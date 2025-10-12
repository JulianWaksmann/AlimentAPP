import json
import logging
import os
import ssl
from typing import Any, Dict, List
from decimal import Decimal

import boto3
import pg8000

# --- Configuración Estándar ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG = None

# --- Funciones Reutilizadas para Conexión a la BD (sin cambios) ---
def get_db_parameters() -> Dict[str, Any]:
    global DB_CONFIG
    if DB_CONFIG:
        return DB_CONFIG
    param_names = [
        "/alimentapp/db/host", "/alimentapp/db/password",
        "/alimentapp/db/port", "/alimentapp/db/username",
    ]
    resp = ssm_client.get_parameters(Names=param_names, WithDecryption=True)
    if len(resp["Parameters"]) != len(param_names):
        missing = set(param_names) - {p["Name"] for p in resp["Parameters"]}
        raise RuntimeError(f"Parámetros faltantes en SSM: {', '.join(missing)}")
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

def run_query(cur, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
    cur.execute(sql, params)
    rows = cur.fetchall()
    if not rows:
        return []
    columns = [desc[0] for desc in cur.description]
    return [dict(zip(columns, row)) for row in rows]

# --- Lógica Principal con Conteo Efímero ---
def check_raw_material_availability(cur, id_orden_venta: int) -> Dict[str, Any]:
    """
    Verifica la disponibilidad de materia prima procesando las órdenes de producción
    secuencialmente y manteniendo un conteo efímero del stock restante.
    """
    # 1. Obtener órdenes de producción, ORDENADAS por ID para procesarlas en secuencia FIFO.
    logger.info(f"Buscando órdenes de producción para la venta ID: {id_orden_venta}, ordenadas por ID.")
    ordenes_produccion = run_query(
        cur,
        f"SELECT id, id_producto, cantidad FROM {ENV}.orden_produccion WHERE id_orden_venta = %s ORDER BY id ASC",
        (id_orden_venta,)
    )
    if not ordenes_produccion:
        return {
            "ordenes_con_stock_suficiente": [],
            "ordenes_con_stock_insuficiente": [],
            "consolidado_faltantes": []
        }

    # 2. Obtener las recetas y el stock inicial (sin cambios)
    product_ids = tuple(op['id_producto'] for op in ordenes_produccion)
    recetas_raw = run_query(
        cur,
        f"SELECT id_producto, id_materia_prima, cantidad_unitaria FROM {ENV}.materia_prima_por_producto WHERE id_producto IN %s",
        (product_ids,)
    )
    recetas_por_producto = {}
    for r in recetas_raw:
        recetas_por_producto.setdefault(r['id_producto'], []).append(r)

    materia_prima_ids = tuple(set(r['id_materia_prima'] for r in recetas_raw))
    stock_disponible_raw = run_query(
        cur,
        f"SELECT id_materia_prima, cantidad_disponible FROM {ENV}.cantidad_disponible_materia_prima WHERE id_materia_prima IN %s",
        (materia_prima_ids,)
    )
    stock_disponible = {item['id_materia_prima']: item['cantidad_disponible'] for item in stock_disponible_raw}

    # 3. Preparar estructuras para el resultado y el CONTEO EFÍMERO
    stock_efimero = stock_disponible.copy() # Copia del stock que iremos descontando
    ordenes_suficientes = []
    ordenes_insuficientes = []
    faltantes_consolidados = {}

    # 4. Procesar cada orden de producción SECUENCIALMENTE
    for op in ordenes_produccion:
        se_puede_producir = True
        requisitos_orden = {} # Guardamos los requisitos de esta orden para descontarlos si es exitosa
        
        receta = recetas_por_producto.get(op['id_producto'], [])
        for ingrediente in receta:
            id_mp = ingrediente['id_materia_prima']
            cantidad_requerida = op['cantidad'] * ingrediente['cantidad_unitaria']
            requisitos_orden[id_mp] = cantidad_requerida
            
            # Comparamos con el stock efímero ACTUAL
            if stock_efimero.get(id_mp, Decimal('0.0')) < cantidad_requerida:
                se_puede_producir = False

        # 5. Clasificar la orden y actualizar el estado efímero
        if se_puede_producir:
            # La orden se puede producir, la agregamos a la lista de suficientes
            ordenes_suficientes.append(op['id'])
            # DESCONTAMOS el stock consumido del conteo efímero
            for id_mp, cantidad_requerida in requisitos_orden.items():
                stock_efimero[id_mp] -= cantidad_requerida
        else:
            # La orden NO se puede producir, la agregamos a la lista de insuficientes
            ordenes_insuficientes.append(op['id'])
            # Consolidamos los faltantes (calculados desde la receta original)
            for id_mp, cantidad_requerida in requisitos_orden.items():
                faltantes_consolidados[id_mp] = faltantes_consolidados.get(id_mp, Decimal('0.0')) + cantidad_requerida

    # 6. Formatear el resultado final
    lista_faltantes = [
        {"id_materia_prima": id_mp, "cantidad_necesaria": total}
        for id_mp, total in faltantes_consolidados.items()
    ]
    
    return {
        "ordenes_con_stock_suficiente": ordenes_suficientes,
        "ordenes_con_stock_insuficiente": ordenes_insuficientes,
        "consolidado_faltantes": lista_faltantes
    }

# --- Handler Principal de la Lambda (sin cambios) ---
def lambda_handler(event, context):
    logger.info(f"Iniciando gestión de materia prima para el evento: {json.dumps(event)}")
    
    id_orden_venta = event.get("id_orden_venta")
    if not id_orden_venta:
        logger.error("El evento no contiene 'id_orden_venta'.")
        return {"statusCode": 400, "body": json.dumps({"error": "Falta 'id_orden_venta' en el evento."})}

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        resultado_verificacion = check_raw_material_availability(cur, id_orden_venta)
        
        logger.info(f"Resultado de la verificación de stock: {json.dumps(resultado_verificacion, default=str)}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Verificación de materia prima completada.",
                "verificacion_stock": resultado_verificacion
            }, default=str)
        }
    except Exception as exc:
        logger.exception("Fallo inesperado durante la gestión de materia prima")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Error interno del servidor", "detail": str(exc)})
        }
    finally:
        if conn:
            conn.close()
            logger.info("Conexión a la base de datos cerrada.")