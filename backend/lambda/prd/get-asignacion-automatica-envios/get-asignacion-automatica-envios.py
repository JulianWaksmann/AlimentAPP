"""
Lambda: Capacitated K-Medoids assignment (producción)

Salida: JSON con propuesta de asignación (sin inserts).
Recomendado para <= 200 pedidos. Si recibís más, la función lanzará excepción
para evitar sobrecarga en Lambda; en ese caso usar chunking o un servicio más potente.
"""

import os
import json
import ssl
import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)
ENV = os.getenv("DB_SCHEMA", "dev")
# Parámetros: punto base (UNGS)
BASE_LAT = -34.521679
BASE_LON = -58.701164

# SSM client y cache
ssm_client = boto3.client("ssm")
DB_CONFIG: Optional[Dict[str, Any]] = None

# Límites prácticos
MAX_ORDERS_LAMBDA = 200
MAX_PAM_ITERS = 5  # número de iteraciones de mejora en PAM (swap)
MAX_DISTANCE_MATRIX = 40000  # por seguridad (n^2 ~ 40k dist ~ 200 pedidos)

class ValidationError(Exception):
    pass

def get_db_parameters() -> Dict[str, Any]:
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
    if len(resp.get("Parameters", [])) != len(param_names):
        missing = set(param_names) - {p["Name"] for p in resp.get("Parameters", [])}
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
    cfg = get_db_parameters()
    return pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=ssl.create_default_context(),
        timeout=10
    )

def run_query(cur, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
    cur.execute(sql, params or [])
    if cur.description is None:
        return []
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in rows]

# ---------- geom helpers ----------
def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

# ---------- data loaders ----------
def cargar_ordenes_candidatas(cur) -> List[Dict[str, Any]]:
    sql = f"""
        SELECT ov.id AS id_orden,
               ov.id_cliente,
               ov.fecha_pedido,
               ov.fecha_entrega_solicitada,
               d.latitud::float AS lat,
               d.longitud::float AS lon,
               COALESCE(sub.total_kg,0)::float AS peso_kg,
               ov.valor_total_pedido,
               ov.id_direccion_entrega
        FROM {ENV}.orden_venta ov
        LEFT JOIN {ENV}.direccion d ON d.id = ov.id_direccion_entrega
        LEFT JOIN (
            SELECT op.id_orden_venta, SUM(op.cantidad * p.peso_unitario_kg)::numeric AS total_kg
            FROM {ENV}.orden_produccion op
            JOIN {ENV}.producto p ON p.id = op.id_producto
            JOIN {ENV}.orden_venta ov2 ON ov2.id = op.id_orden_venta
            WHERE ov2.estado = 'lista' AND ov2.con_envio = true
            GROUP BY op.id_orden_venta
        ) sub ON sub.id_orden_venta = ov.id
        WHERE ov.estado = 'lista' AND ov.con_envio = true;
    """
    rows = run_query(cur, sql)
    orders = []
    for r in rows:
        # validamos coords: en esta versión asumiste que todos tienen coords (opción A)
        if r["lat"] is None or r["lon"] is None:
            raise ValidationError(f"Orden {r['id_orden']} sin coordenadas (se solicitó A: todos con lat/lon).")
        orders.append({
            "id": r["id_orden"],
            "id_cliente": r["id_cliente"],
            "fecha_pedido": r["fecha_pedido"],
            "fecha_entrega_solicitada": r["fecha_entrega_solicitada"],
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "peso": float(r["peso_kg"]) if r["peso_kg"] is not None else 0.0,
            "valor_total_pedido": float(r["valor_total_pedido"]) if r.get("valor_total_pedido") is not None else 0.0,
            "id_direccion_entrega": r.get("id_direccion_entrega")
        })
    return orders

def cargar_productos_pedido(cur, id_ov) -> List[Dict[str, Any]]:
    sql = f"""
        SELECT op.id_producto AS id, p.nombre, op.cantidad
        FROM {ENV}.orden_produccion op
        JOIN {ENV}.producto p ON p.id = op.id_producto
        WHERE op.id_orden_venta = %s;
    """
    return run_query(cur, sql, [id_ov])

def cargar_info_cliente(cur, id_cliente) -> Optional[Dict[str, Any]]:
    sql = f"""
        SELECT id, razon_social, email, nombre_contacto, apellido_contacto, telefono
        FROM {ENV}.cliente WHERE id = %s;
    """
    rows = run_query(cur, sql, [id_cliente])
    return rows[0] if rows else None

def cargar_direccion_text(cur, id_direccion) -> Optional[str]:
    if id_direccion is None:
        return None
    rows = run_query(cur, f"SELECT direccion_text FROM {ENV}.direccion WHERE id = %s;", [id_direccion])
    return rows[0].get("direccion_text") if rows else None

def cargar_vehiculos_disponibles(cur) -> List[Dict[str, Any]]:
    sql = f"""
        SELECT id, empresa, nombre_conductor, apellido_conductor, dni_conductor,
               tipo_unidad, patente, modelo, capacidad_kg
        FROM {ENV}.vehiculo
        WHERE disponible = true
        ORDER BY capacidad_kg DESC;
    """
    rows = run_query(cur, sql)
    for r in rows:
        r["capacidad_kg"] = float(r.get("capacidad_kg", 0))
    return rows

# ---------- PAM-like K-medoids (inicial + swap) ----------
def compute_distance_matrix(points: List[Tuple[float,float]]) -> List[List[float]]:
    n = len(points)
    if n * n > MAX_DISTANCE_MATRIX:
        # protección
        raise ValidationError(f"Demasiadas distancias a calcular ({n} puntos). Reduce la cantidad de pedidos.")
    mat = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(i+1, n):
            d = haversine_km(points[i][0], points[i][1], points[j][0], points[j][1])
            mat[i][j] = d
            mat[j][i] = d
    return mat

def pam_kmedoids(points_coords: List[Tuple[float,float]], k: int) -> List[int]:
    """
    points_coords: list of (lat, lon)
    returns indices of medoids (length k)
    Implementation: greedy initialization (farthest-first) + limited swaps (PAM)
    """
    n = len(points_coords)
    if k <= 0:
        return []
    if k >= n:
        return list(range(n))
    # init: farthest-first (choose one far from base, then farthest from chosen set)
    medoids = []
    # choose first: farthest from BASE
    dists_base = [haversine_km(BASE_LAT, BASE_LON, p[0], p[1]) for p in points_coords]
    first = max(range(n), key=lambda i: dists_base[i])
    medoids.append(first)
    while len(medoids) < k:
        # choose point maximizing min distance to existing medoids
        candidate = max(
            (i for i in range(n) if i not in medoids),
            key=lambda i: min(haversine_km(points_coords[i][0], points_coords[i][1], points_coords[m][0], points_coords[m][1]) for m in medoids)
        )
        medoids.append(candidate)

    # compute distance matrix
    dist_mat = compute_distance_matrix(points_coords)

    # helper: assignment cost to nearest medoid
    def total_cost(meds: List[int]) -> float:
        cost = 0.0
        for i in range(n):
            cost += min(dist_mat[i][m] for m in meds)
        return cost

    # PAM-like swap improvement (limited iterations)
    current_medoids = medoids[:]
    current_cost = total_cost(current_medoids)
    for _ in range(MAX_PAM_ITERS):
        improved = False
        for m in current_medoids:
            for o in range(n):
                if o in current_medoids:
                    continue
                cand = [x for x in current_medoids if x != m] + [o]
                cand_cost = total_cost(cand)
                if cand_cost + 1e-9 < current_cost:
                    current_medoids = cand
                    current_cost = cand_cost
                    improved = True
        if not improved:
            break
    return sorted(current_medoids)

# ---------- cluster assignment and split by capacity ----------
def assign_to_medoids_and_split(orders: List[Dict[str,Any]], medoid_indices: List[int], vehicles: List[Dict[str,Any]]) -> Tuple[List[List[int]], List[int]]:
    """
    orders: list of orders (with lat, lon, peso)
    medoid_indices: indices into orders list chosen as medoids
    vehicles: list of vehicle dicts ordered by capacity desc
    Returns:
      clusters: list of clusters where each cluster is list of order ids
      oversized: list of order ids that exceed max vehicle capacity
    """
    n = len(orders)
    idx_map = {orders[i]["id"]: i for i in range(n)}
    # compute max vehicle capacity
    max_cap = max((v["capacidad_kg"] for v in vehicles), default=0.0)
    oversized = [o["id"] for o in orders if o["peso"] > max_cap]
    # filter orders that can be assigned
    assignable = [o for o in orders if o["id"] not in oversized]
    if not assignable:
        return ([], oversized)

    # map index in assignable list
    assign_idx_map = {assignable[i]["id"]: i for i in range(len(assignable))}
    points = [(o["lat"], o["lon"]) for o in assignable]
    # medoids indices are relative to full orders; convert to assignable indices if present
    medoids_local = []
    for mi in medoid_indices:
        oid = orders[mi]["id"]
        if oid in assign_idx_map:
            medoids_local.append(assign_idx_map[oid])
    # if medoids_local < vehicles count, pad by farthest-from-base
    k = len(vehicles)
    if len(medoids_local) < k:
        remaining = [i for i in range(len(assignable)) if i not in medoids_local]
        remaining_sorted = sorted(remaining, key=lambda i: haversine_km(BASE_LAT, BASE_LON, points[i][0], points[i][1]), reverse=True)
        for r in remaining_sorted:
            if len(medoids_local) >= k:
                break
            medoids_local.append(r)

    # assign each assignable order to nearest medoid
    clusters_local: Dict[int, List[int]] = {m: [] for m in medoids_local}
    for i, p in enumerate(points):
        # find nearest medoid
        best_m = min(medoids_local, key=lambda m: haversine_km(points[m][0], points[m][1], p[0], p[1]))
        clusters_local[best_m].append(i)

    # convert clusters_local to clusters of order ids
    clusters: List[List[int]] = []
    for m in medoids_local:
        cluster_ids = [assignable[i]["id"] for i in clusters_local.get(m, [])]
        clusters.append(cluster_ids)

    # now each cluster must be compared to vehicles capacity; if cluster total peso <= some vehicle capacity assign as-is,
    # else split cluster into subclusters greedily by distance to cluster medoid until capacities satisfied.
    # We'll return a list of clusters (subclusters) ready to map to vehicles.
    final_clusters: List[List[int]] = []
    for cluster in clusters:
        # compute peso total
        cluster_orders = [next(o for o in assignable if o["id"] == oid) for oid in cluster]
        total_peso = sum(o["peso"] for o in cluster_orders)
        # if fits into largest vehicle, keep as one cluster
        if total_peso <= max((v["capacidad_kg"] for v in vehicles), default=0.0):
            final_clusters.append(cluster)
            continue
        # else split greedily: start new subcluster seed at medoid and add nearest until capacity reached, repeat
        # build a local points dict
        local_points = {o["id"]: (o["lat"], o["lon"], o["peso"]) for o in cluster_orders}
        unplaced = set(local_points.keys())
        while unplaced:
            # start a new subcluster with the unplaced order farthest from medoid (or farthest-from-base if medoid coord missing)
            seed_id = max(unplaced, key=lambda oid: haversine_km(BASE_LAT, BASE_LON, local_points[oid][0], local_points[oid][1]))
            sub = []
            cap_remaining = max((v["capacidad_kg"] for v in vehicles), default=0.0)
            # add closest while capacity permits
            while True:
                # find candidate in unplaced that fits in cap_remaining and is closest to current seed centroid
                if not sub:
                    center = (local_points[seed_id][0], local_points[seed_id][1])
                else:
                    # centroid of sub
                    coords = [(local_points[x][0], local_points[x][1]) for x in sub]
                    center = (sum(c[0] for c in coords)/len(coords), sum(c[1] for c in coords)/len(coords))
                candidates = sorted(list(unplaced), key=lambda oid: haversine_km(center[0], center[1], local_points[oid][0], local_points[oid][1]))
                placed_any = False
                for cid in candidates:
                    peso = local_points[cid][2]
                    if peso <= cap_remaining:
                        sub.append(cid)
                        unplaced.remove(cid)
                        cap_remaining -= peso
                        placed_any = True
                        break
                if not placed_any:
                    break
            final_clusters.append(sub)
    return (final_clusters, oversized)

# ---------- map clusters to vehicles ----------
def map_clusters_to_vehicles(clusters: List[List[int]], vehicles: List[Dict[str,Any]], orders_by_id: Dict[int, Dict[str,Any]]) -> Dict[int,List[int]]:
    """
    clusters: list of clusters (lists of order ids)
    vehicles: list of vehicle dicts (ordered by capacidad desc)
    returns assignments: veh_id -> list of order ids
    Strategy:
      - compute cluster weight
      - sort clusters desc by weight
      - sort vehicles desc by capacity
      - assign heaviest cluster to largest vehicle; if cluster too big for vehicle, it should have been split earlier
      - if leftover vehicles exist assign smaller clusters
    """
    clusters_weight = [(i, sum(orders_by_id[oid]["peso"] for oid in cl)) for i, cl in enumerate(clusters)]
    clusters_weight.sort(key=lambda x: x[1], reverse=True)
    veh_sorted = sorted(vehicles, key=lambda v: v["capacidad_kg"], reverse=True)
    assignments: Dict[int, List[int]] = {v["id"]: [] for v in vehicles}
    veh_cap_remaining = {v["id"]: v["capacidad_kg"] for v in vehicles}

    for ci, weight in clusters_weight:
        cl = clusters[ci]
        # try to find vehicle that can take entire cluster (prefer smallest vehicle that fits to avoid waste)
        possible = sorted([v for v in veh_sorted if veh_cap_remaining[v["id"]] >= weight], key=lambda v: v["capacidad_kg"])
        if possible:
            chosen = possible[0]
            assignments[chosen["id"]].extend(cl)
            veh_cap_remaining[chosen["id"]] -= weight
        else:
            # no single vehicle can take whole cluster (should be rare if we split correctly); try to fit greedily across vehicles
            remaining = list(cl)
            # sort vehicles by remaining cap desc
            for v in veh_sorted:
                if not remaining:
                    break
                if veh_cap_remaining[v["id"]] <= 0:
                    continue
                placed = []
                for oid in list(remaining):
                    peso = orders_by_id[oid]["peso"]
                    if peso <= veh_cap_remaining[v["id"]]:
                        assignments[v["id"]].append(oid)
                        veh_cap_remaining[v["id"]] -= peso
                        remaining.remove(oid)
                # continue to next vehicle
            # if still remaining -> they become unassigned (will be handled)
    return assignments

# ---------- routing heuristic (nearest neighbor) and distance estimation ----------
def route_nearest_neighbor(order_coords: List[Tuple[float,float]], start: Tuple[float,float]=(BASE_LAT,BASE_LON)) -> Tuple[List[int], float]:
    """
    order_coords: list of (order_id, lat, lon)
    returns: visiting order_ids in NN order and total distance from start and between points (not returning to base)
    """
    if not order_coords:
        return ([], 0.0)
    remaining = order_coords[:]
    current = start
    route = []
    total = 0.0
    while remaining:
        # find nearest
        best_idx = min(range(len(remaining)), key=lambda i: haversine_km(current[0], current[1], remaining[i][1], remaining[i][2]))
        nxt = remaining.pop(best_idx)
        d = haversine_km(current[0], current[1], nxt[1], nxt[2])
        total += d
        route.append(nxt[0])
        current = (nxt[1], nxt[2])
    return route, total

# ---------- main orchestration ----------
def build_full_output(cur, assignments: Dict[int,List[int]], vehicles: List[Dict[str,Any]], sin_asignar: List[int], oversized: List[int]) -> Dict[str,Any]:
    # orders info loaded on-demand
    veh_output = []
    # build dict orders->peso for metrics
    orders_cache: Dict[int, Dict[str,Any]] = {}
    for vid, oids in assignments.items():
        pedidos_list = []
        coords_for_route = []
        total_peso = 0.0
        for oid in oids:
            # load pedido metadata
            sql_pedido = f"""
                SELECT ov.id AS id_orden_venta, ov.id_cliente, c.razon_social, c.email,
                       c.nombre_contacto, c.apellido_contacto, c.telefono, d.direccion_text,
                       ov.fecha_pedido, ov.fecha_entrega_solicitada, ov.valor_total_pedido, d.latitud::float AS lat, d.longitud::float AS lon
                FROM {ENV}.orden_venta ov
                JOIN {ENV}.cliente c ON c.id = ov.id_cliente
                LEFT JOIN {ENV}.direccion d ON d.id = ov.id_direccion_entrega
                WHERE ov.id = %s;
            """
            rows = run_query(cur, sql_pedido, [oid])
            if not rows:
                continue
            p = rows[0]
            productos = cargar_productos_pedido(cur, oid)
            peso_total = round(sum((prod.get("cantidad",0) * fetch_peso_unitario(cur, prod["id"])) for prod in productos), 3)
            pedidos_list.append({
                "id_orden_venta": p["id_orden_venta"],
                "id_cliente": p["id_cliente"],
                "razon_social": p.get("razon_social"),
                "email": p.get("email"),
                "nombre_contacto": p.get("nombre_contacto"),
                "apellido_contacto": p.get("apellido_contacto"),
                "telefono": p.get("telefono"),
                "direccion_txt": p.get("direccion_text"),
                "productos": productos,
                "fecha_pedido": p.get("fecha_pedido").isoformat() if p.get("fecha_pedido") else None,
                "fecha_entrega_solicitada": p.get("fecha_entrega_solicitada").isoformat() if p.get("fecha_entrega_solicitada") else None,
                "valor_total_pedido": float(p.get("valor_total_pedido")) if p.get("valor_total_pedido") is not None else 0.0,
                "peso_total_pedido": peso_total
            })
            orders_cache[oid] = {"peso": peso_total, "lat": p.get("lat"), "lon": p.get("lon")}
            total_peso += peso_total
            if p.get("lat") is not None and p.get("lon") is not None:
                coords_for_route.append((oid, float(p.get("lat")), float(p.get("lon"))))
        # route heuristic
        route_order_ids, est_distance = route_nearest_neighbor(coords_for_route, (BASE_LAT, BASE_LON))
        veh = next((v for v in vehicles if v["id"] == vid), None)
        if not veh:
            continue
        used_pct = round((total_peso / veh["capacidad_kg"]) * 100.0, 2) if veh["capacidad_kg"] > 0 else 0.0
        veh_output.append({
            "id_vehiculo": veh["id"],
            "patente": veh.get("patente"),
            "tipo_unidad": veh.get("tipo_unidad"),
            "modelo": veh.get("modelo"),
            "empresa": veh.get("empresa"),
            "nombre_conductor": veh.get("nombre_conductor"),
            "apellido_conductor": veh.get("apellido_conductor"),
            "dni_conductor": veh.get("dni_conductor"),
            "capacidad_kg": veh.get("capacidad_kg"),
            "capacidad_usada_kg": round(total_peso,3),
            "capacidad_usada_pct": used_pct,
            "distancia_estimada_km": round(est_distance,3),
            "pedidos": pedidos_list
        })

    return {
        "vehiculos": veh_output,
        "pedidos_sin_asignar": sin_asignar,
        "pedidos_exceden_peso_vehiculo": oversized
    }

def fetch_peso_unitario(cur, product_id) -> float:
    rows = run_query(cur, f"SELECT peso_unitario_kg FROM {ENV}.producto WHERE id = %s", [product_id])
    if not rows:
        return 0.0
    return float(rows[0]["peso_unitario_kg"])

# ---------- LAMBDA HANDLER ----------
def lambda_handler(event, context):
    logger.info("Evento recibido")
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1) cargar datos
        orders = cargar_ordenes_candidatas(cur)
        vehicles = cargar_vehiculos_disponibles(cur)

        if len(orders) == 0:
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"vehiculos": [], "pedidos_sin_asignar": [], "pedidos_exceden_peso_vehiculo": []})}

        if len(orders) > MAX_ORDERS_LAMBDA:
            raise ValidationError(f"Demasiadas ordenes ({len(orders)}). Máximo recomendado: {MAX_ORDERS_LAMBDA} para ejecución en Lambda.")

        # 2) k medoids: build points list
        points = [(o["lat"], o["lon"]) for o in orders]
        k = max(1, len(vehicles))  # k = Nº de vehículos disponibles
        medoid_indices = pam_kmedoids(points, k)

        # 3) cluster + split por capacidad
        clusters, oversized = assign_to_medoids_and_split(orders, medoid_indices, vehicles)

        # 4) map clusters to vehicles
        orders_by_id = {o["id"]: o for o in orders}
        assignments = map_clusters_to_vehicles(clusters, vehicles, orders_by_id)

        # 5) compute sin_asignar (orders not in assignments and not oversized)
        assigned_ids = set()
        for lst in assignments.values():
            assigned_ids.update(lst)
        sin_asignar = [o["id"] for o in orders if (o["id"] not in assigned_ids and o["id"] not in oversized)]

        # 6) build full output with productos/clientes
        output = build_full_output(cur, assignments, vehicles, sin_asignar, oversized)

        return {
            "statusCode": 200,
            "headers": cors | {"Content-Type": "application/json"},
            "body": json.dumps(output, default=str)
        }

    except ValidationError as e:
        logger.warning("Validation error: %s", str(e))
        return {"statusCode": 400, "headers": cors | {"Content-Type": "application/json"}, "body": json.dumps({"error": str(e)})}
    except Exception as e:
        logger.exception("Error interno")
        return {"statusCode": 500, "headers": cors | {"Content-Type": "application/json"}, "body": json.dumps({"error": "Error interno", "detail": str(e)})}
    finally:
        try:
            if cur:
                cur.close()
        except:
            pass
        if conn:
            conn.close()
