import json
import logging
import os
import ssl
import boto3
import pg8000
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, List

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ENV = os.getenv("DB_SCHEMA", "dev")
ssm_client = boto3.client("ssm")

DB_CONFIG: Optional[Dict[str, Any]] = None
ssl_context = ssl.create_default_context()


class ValidationError(Exception):
    """Error de validación."""

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
        ssl_context=ssl_context,
        timeout=10,
    )

def query_georef(street, number, city, state):
    params = {
        "direccion": f"{street} {number}" if number else street,
        "provincia": state,
        "localidad": city,
        "max": 1
    }
    print(f"❓ Consultando Georef por localidad '{city}': {params['direccion']}")

    base_url = "https://apis.datos.gob.ar/georef/api/direcciones"
    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    headers = {"User-Agent": "AlimentApp/1.5"}
    context = ssl.create_default_context()

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=context, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            data = json.loads(content)

        direcciones = data.get("direcciones", [])

        # Si no encuentra resultados, intentar búsqueda más amplia sin localidad/departamento
        if not direcciones:
            print("⚠️ No se encontraron resultados, intentando búsqueda amplia...")
            params_amplio = {
                "direccion": f"{street} {number}" if number else street,
                "provincia": state,
                "max": 5
            }
            url_amplio = f"{base_url}?{urllib.parse.urlencode(params_amplio)}"
            
            req = urllib.request.Request(url_amplio, headers=headers)
            with urllib.request.urlopen(req, context=context, timeout=10) as resp:
                content = resp.read().decode("utf-8")
                data = json.loads(content)
            
            direcciones = data.get("direcciones", [])

        if not direcciones:
            print("⚠️ Georef no encontró coincidencias")
            return []

        print(f"✅ Georef devolvió {len(direcciones)} resultados")
        normalizadas = []

        for d in direcciones:
            raw_calle = d["calle"]["nombre"]
            numero = d.get("altura", {}).get("valor", "")

            # Remover número incrustado en el nombre de la calle
            if numero and str(numero) in raw_calle:
                raw_calle = raw_calle.replace(str(numero), "").strip()

            # Capitalizado correcto
            calle = raw_calle.title()

            ciudad = (
                d.get("localidad", {}).get("nombre")
                or d.get("localidad_censal", {}).get("nombre")
                or d.get("ciudad", {}).get("nombre")
                or ""
            )

            provincia = d["provincia"]["nombre"]

            direccion_normalizada = ", ".join(
                x for x in [f"{calle} {numero}", ciudad, provincia] if x
            )

            barrio = (
                d.get("barrio", {}).get("nombre")
                or d.get("localidad_censal", {}).get("nombre")
                or None
            )

            departamento_resultado = d.get("departamento", {}).get("nombre", "")

            normalizadas.append({
                "direccion_normalizada": direccion_normalizada,
                "latitud": d["ubicacion"]["lat"],
                "longitud": d["ubicacion"]["lon"],
                "detalles": {
                    "numero": numero,
                    "calle": calle,
                    "barrio": barrio,
                    "ciudad": ciudad,
                    "provincia": provincia,
                    "departamento": departamento_resultado,
                    "pais": "Argentina",
                    "codigo_postal": None
                }
            })

        return normalizadas

    except Exception as e:
        print(f"❌ Error consultando Georef: {e}")
        return []

def create_new_address(id_cliente: int, direccion_normalizada: str, latitud: float, longitud: float) -> int:
    api_url = "https://eldzogehdj.execute-api.us-east-1.amazonaws.com/prd/crear-direccion/post-crear-direccion"

    payload = {
        "id_cliente": id_cliente,
        "direccion_text": direccion_normalizada,
        "latitud": latitud,  # mock coordenadas
        "longitud": longitud,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(api_url, data=data, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req) as response:
            resp_data = json.loads(response.read().decode("utf-8"))
            logger.info(f"Dirección creada correctamente: {resp_data}")
            return resp_data.get("id_direccion")
    except Exception as e:
        logger.error(f"Error al crear dirección vía API: {e}")
        raise ValidationError("No se pudo crear la dirección nueva.")

def lambda_handler(event, context):
    logger.info("Evento recibido: %s", event)

    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        body = event.get("body")
        payload = json.loads(body) if isinstance(body, str) else body

        required = ["id_cliente", "calle", "numero", "localidad", "provincia"]
        missing = [k for k in required if k not in payload or not payload[k]]
        if missing:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": f"Faltan campos obligatorios: {', '.join(missing)}"}),
            }

        street = payload.get("calle", "")
        number = payload.get("numero", "")
        city = payload.get("localidad", "")
        state = payload.get("provincia", "")
        results = query_georef(street, number, city, state)

        if not results:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": "No se encuentra la direccion"}),
            }

        id_cliente = int(payload.get("id_cliente", ""))
        direccion_normalizada = results[0]["direccion_normalizada"]
        latitud = float(results[0]["latitud"])
        longitud = float(results[0]["longitud"])
        id_direccion_creada = create_new_address(id_cliente, direccion_normalizada, latitud, longitud)

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"id_direccion_creada": id_direccion_creada}, ensure_ascii=False),
        }

    except Exception as e:
        logger.exception("Error al normalizar dirección")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({"error": "Error interno", "detail": str(e)}),
        }