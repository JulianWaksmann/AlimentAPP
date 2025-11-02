"""Lambda utilitaria: genera datos de prueba (OV + OP) sin bucles.

- Calcula base_ov = MAX(id) + 1 en orden_venta
- Inserta 29 OV (confirmadas) con fechas escalonadas (0..28 días)
- Inserta 29×7 OP (explícitas, 1x1) mapeando grupo N → id_orden_venta = base_ov + N
- Todas las OP en estado 'lista_para_produccion' y observaciones 'test'
"""

import json
import logging
import os
import ssl
from typing import Any, Dict, Iterable, Optional, Tuple

import boto3
import pg8000

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")
DB_CONFIG: Optional[Dict[str, Any]] = None
SSL_CONTEXT = ssl.create_default_context()


class SeedError(Exception):
    """Errores funcionales durante la generación de datos de prueba."""


def get_db_parameters() -> Dict[str, Any]:
    """Obtiene credenciales de RDS desde SSM y las cachea en memoria."""
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
        raise SeedError(f"Faltan parámetros en SSM: {', '.join(sorted(missing))}")
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


def fetch_all(cur, sql: str, params: Iterable[Any] = None):
    """SELECT → lista de dicts (columns → values)."""
    cur.execute(sql, tuple(params or ()))
    rows = cur.fetchall()
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in rows]


def run_command(cur, sql: str) -> None:
    """Ejecuta DML (INSERT/UPDATE/DELETE) sin parámetros."""
    cur.execute(sql)


def obtener_cliente_id(cur) -> int:
    """Devuelve un id_cliente válido (toma el primero disponible)."""
    row = fetch_all(cur, f"SELECT id FROM {ENV}.cliente LIMIT 1")
    if not row:
        raise SeedError("No existe ningún cliente; crea uno antes de seedear.")
    return int(row[0]["id"])


def max_id_orden_venta(cur) -> int:
    """Obtiene el máximo id actual de orden_venta (o 0 si no hay registros)."""
    row = fetch_all(cur, f"SELECT COALESCE(MAX(id), 0) AS max_id FROM {ENV}.orden_venta")
    return int(row[0]["max_id"]) if row else 0


def insertar_ordenes_venta_explicit(cur, cliente_id: int) -> Tuple[int, ...]:
    """Inserta 29 OV confirmadas y devuelve sus IDs (asumidos consecutivos)."""
    ids = []
    for days in range(29):
        cur.execute(
            f"INSERT INTO {ENV}.orden_venta (id_cliente, id_empleado, fecha_pedido, fecha_entrega_solicitada, estado, valor_total_pedido, observaciones) VALUES ({cliente_id}, NULL, NOW(), NOW() + INTERVAL '{days} days', 'confirmada', 0, 'test') RETURNING id"
        )
        ids.append(int(cur.fetchone()[0]))
    return tuple(ids)


def insertar_ordenes_produccion_explicit(cur, ov_ids: Tuple[int, ...]) -> None:
    """Inserta OP 1x1 por 29 grupos (0..28) usando los IDs reales de OV."""
    def ins(ov_id: int, p: int, cant: int) -> None:
        run_command(cur, f"INSERT INTO {ENV}.orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ({ov_id}, {p}, 'lista_para_produccion', {cant}, 'test')")

    # Grupo 0
    ins(ov_ids[0],1,5);  ins(ov_ids[0],2,4);  ins(ov_ids[0],3,3);  ins(ov_ids[0],4,6);  ins(ov_ids[0],5,5);  ins(ov_ids[0],6,10); ins(ov_ids[0],7,8)
    # Grupo 1
    ins(ov_ids[1],1,6);  ins(ov_ids[1],2,6);  ins(ov_ids[1],3,5);  ins(ov_ids[1],4,8);  ins(ov_ids[1],5,7);  ins(ov_ids[1],6,13); ins(ov_ids[1],7,10)
    # Grupo 2
    ins(ov_ids[2],1,7);  ins(ov_ids[2],2,6);  ins(ov_ids[2],3,7);  ins(ov_ids[2],4,10); ins(ov_ids[2],5,9);  ins(ov_ids[2],6,16); ins(ov_ids[2],7,12)
    # Grupo 3
    ins(ov_ids[3],1,12); ins(ov_ids[3],2,7);  ins(ov_ids[3],3,6);  ins(ov_ids[3],4,12); ins(ov_ids[3],5,11); ins(ov_ids[3],6,19); ins(ov_ids[3],7,14)
    # Grupo 4
    ins(ov_ids[4],1,9);  ins(ov_ids[4],2,8);  ins(ov_ids[4],3,7);  ins(ov_ids[4],4,14); ins(ov_ids[4],5,13); ins(ov_ids[4],6,22); ins(ov_ids[4],7,16)
    # Grupo 5
    ins(ov_ids[5],1,10); ins(ov_ids[5],2,9);  ins(ov_ids[5],3,8);  ins(ov_ids[5],4,16); ins(ov_ids[5],5,15); ins(ov_ids[5],6,25); ins(ov_ids[5],7,18)
    # Grupo 6
    ins(ov_ids[6],1,11); ins(ov_ids[6],2,10); ins(ov_ids[6],3,9);  ins(ov_ids[6],4,18); ins(ov_ids[6],5,17); ins(ov_ids[6],6,28); ins(ov_ids[6],7,20)
    # Grupos 7..28
    ins(ov_ids[7],1,12); ins(ov_ids[7],2,11); ins(ov_ids[7],3,10); ins(ov_ids[7],4,20); ins(ov_ids[7],5,19); ins(ov_ids[7],6,31); ins(ov_ids[7],7,22)
    ins(ov_ids[8],1,13); ins(ov_ids[8],2,12); ins(ov_ids[8],3,11); ins(ov_ids[8],4,22); ins(ov_ids[8],5,21); ins(ov_ids[8],6,34); ins(ov_ids[8],7,24)
    ins(ov_ids[9],1,14); ins(ov_ids[9],2,13); ins(ov_ids[9],3,12); ins(ov_ids[9],4,24); ins(ov_ids[9],5,23); ins(ov_ids[9],6,37); ins(ov_ids[9],7,26)
    ins(ov_ids[10],1,15);ins(ov_ids[10],2,14);ins(ov_ids[10],3,13);ins(ov_ids[10],4,26);ins(ov_ids[10],5,25);ins(ov_ids[10],6,40);ins(ov_ids[10],7,28)
    ins(ov_ids[11],1,16);ins(ov_ids[11],2,15);ins(ov_ids[11],3,14);ins(ov_ids[11],4,28);ins(ov_ids[11],5,27);ins(ov_ids[11],6,43);ins(ov_ids[11],7,30)
    ins(ov_ids[12],1,17);ins(ov_ids[12],2,16);ins(ov_ids[12],3,15);ins(ov_ids[12],4,30);ins(ov_ids[12],5,29);ins(ov_ids[12],6,46);ins(ov_ids[12],7,32)
    ins(ov_ids[13],1,18);ins(ov_ids[13],2,17);ins(ov_ids[13],3,16);ins(ov_ids[13],4,32);ins(ov_ids[13],5,31);ins(ov_ids[13],6,49);ins(ov_ids[13],7,34)
    ins(ov_ids[14],1,19);ins(ov_ids[14],2,18);ins(ov_ids[14],3,17);ins(ov_ids[14],4,34);ins(ov_ids[14],5,33);ins(ov_ids[14],6,52);ins(ov_ids[14],7,36)
    ins(ov_ids[15],1,20);ins(ov_ids[15],2,19);ins(ov_ids[15],3,18);ins(ov_ids[15],4,36);ins(ov_ids[15],5,35);ins(ov_ids[15],6,55);ins(ov_ids[15],7,38)
    ins(ov_ids[16],1,21);ins(ov_ids[16],2,20);ins(ov_ids[16],3,19);ins(ov_ids[16],4,38);ins(ov_ids[16],5,37);ins(ov_ids[16],6,58);ins(ov_ids[16],7,40)
    ins(ov_ids[17],1,22);ins(ov_ids[17],2,21);ins(ov_ids[17],3,20);ins(ov_ids[17],4,40);ins(ov_ids[17],5,39);ins(ov_ids[17],6,61);ins(ov_ids[17],7,42)
    ins(ov_ids[18],1,23);ins(ov_ids[18],2,22);ins(ov_ids[18],3,21);ins(ov_ids[18],4,42);ins(ov_ids[18],5,41);ins(ov_ids[18],6,64);ins(ov_ids[18],7,44)
    ins(ov_ids[19],1,24);ins(ov_ids[19],2,23);ins(ov_ids[19],3,22);ins(ov_ids[19],4,44);ins(ov_ids[19],5,43);ins(ov_ids[19],6,67);ins(ov_ids[19],7,46)
    ins(ov_ids[20],1,25);ins(ov_ids[20],2,24);ins(ov_ids[20],3,23);ins(ov_ids[20],4,46);ins(ov_ids[20],5,45);ins(ov_ids[20],6,70);ins(ov_ids[20],7,48)
    ins(ov_ids[21],1,26);ins(ov_ids[21],2,25);ins(ov_ids[21],3,24);ins(ov_ids[21],4,48);ins(ov_ids[21],5,47);ins(ov_ids[21],6,73);ins(ov_ids[21],7,50)
    ins(ov_ids[22],1,27);ins(ov_ids[22],2,26);ins(ov_ids[22],3,25);ins(ov_ids[22],4,50);ins(ov_ids[22],5,49);ins(ov_ids[22],6,76);ins(ov_ids[22],7,52)
    ins(ov_ids[23],1,28);ins(ov_ids[23],2,27);ins(ov_ids[23],3,26);ins(ov_ids[23],4,52);ins(ov_ids[23],5,51);ins(ov_ids[23],6,79);ins(ov_ids[23],7,54)
    ins(ov_ids[24],1,29);ins(ov_ids[24],2,28);ins(ov_ids[24],3,27);ins(ov_ids[24],4,54);ins(ov_ids[24],5,53);ins(ov_ids[24],6,82);ins(ov_ids[24],7,56)
    ins(ov_ids[25],1,30);ins(ov_ids[25],2,29);ins(ov_ids[25],3,28);ins(ov_ids[25],4,56);ins(ov_ids[25],5,55);ins(ov_ids[25],6,85);ins(ov_ids[25],7,58)
    ins(ov_ids[26],1,31);ins(ov_ids[26],2,30);ins(ov_ids[26],3,29);ins(ov_ids[26],4,58);ins(ov_ids[26],5,57);ins(ov_ids[26],6,88);ins(ov_ids[26],7,60)
    ins(ov_ids[27],1,32);ins(ov_ids[27],2,31);ins(ov_ids[27],3,30);ins(ov_ids[27],4,60);ins(ov_ids[27],5,59);ins(ov_ids[27],6,91);ins(ov_ids[27],7,62)
    ins(ov_ids[28],1,33);ins(ov_ids[28],2,32);ins(ov_ids[28],3,31);ins(ov_ids[28],4,62);ins(ov_ids[28],5,61);ins(ov_ids[28],6,94);ins(ov_ids[28],7,64)


def parse_event(event: Any) -> Dict[str, Any]:
    """Normaliza el evento de entrada (APIGW body o dict plano)."""
    if not event:
        return {}
    if isinstance(event, dict) and "body" in event:
        body = event["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                return {}
        if isinstance(body, dict):
            return body
    if isinstance(event, dict):
        return event
    return {}


def lambda_handler(event, context):
    """Entry point: inserta 29 OV confirmadas y 29×7 OP sin bucles."""
    _ = parse_event(event)

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cliente_id = obtener_cliente_id(cur)
        base_ov = max_id_orden_venta(cur) + 1
        ov_ids = insertar_ordenes_venta_explicit(cur, cliente_id)
        logger.info("base_ov=%s, first_ov=%s, last_ov=%s", base_ov, ov_ids[0], ov_ids[-1])

        insertar_ordenes_produccion_explicit(cur, ov_ids)

        conn.commit()
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "ordenes_venta_creadas": 29,
                "base_ov": base_ov,
                "op_creadas": 29 * 7,
            }),
        }
    except Exception as exc:
        if conn:
            conn.rollback()
        logger.exception("Fallo generando datos de prueba")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Error interno", "detail": str(exc)}),
        }
    finally:
        if conn:
            conn.close()
