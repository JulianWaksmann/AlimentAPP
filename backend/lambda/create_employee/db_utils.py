import os
import ssl
from typing import Any, Iterable, Optional

import boto3
import pg8000

_PARAM_NAMES = [
    "/alimentapp/db/host",
    "/alimentapp/db/password",
    "/alimentapp/db/port",
    "/alimentapp/db/username",
]


def get_credentials():
    """
    Obtiene credenciales desde SSM o usa el fallback de RDS.
    """
    try:
        ssm_client = boto3.client("ssm", region_name=os.getenv("AWS_REGION", "us-east-1"))
        response = ssm_client.get_parameters(Names=_PARAM_NAMES, WithDecryption=True)
        if len(response["Parameters"]) != len(_PARAM_NAMES):
            raise ValueError("Missing parameters from SSM")
        data = {param["Name"].split("/")[-1]: param["Value"] for param in response["Parameters"]}
        return {
            "host": data["host"],
            "port": int(data.get("port", "5432")),
            "user": data["username"],
            "password": data["password"],
            "database": os.getenv("DB_NAME", "postgres"),
        }
    except Exception:
        return {
            "host": os.getenv("DB_HOST", "db-alimentapp.cm7oyoiiqchb.us-east-1.rds.amazonaws.com"),
            "port": int(os.getenv("DB_PORT", "5432")),
            "user": os.getenv("DB_USER", "labo_team"),
            "password": os.getenv("DB_PASSWORD", "Aprobemos123!"),
            "database": os.getenv("DB_NAME", "postgres"),
        }


def get_connection():
    """
    Abre una conexion a la base RDS usando pg8000 y SSL.
    """
    creds = get_credentials()
    return pg8000.connect(
        host=creds["host"],
        port=creds["port"],
        database=creds["database"],
        user=creds["user"],
        password=creds["password"],
        ssl_context=ssl.create_default_context(),
        timeout=10,
    )


def execute_non_query(query: str, params: Optional[Iterable[Any]] = None) -> None:
    """
    Ejecuta INSERT/UPDATE/DELETE y confirma la transaccion.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        conn.commit()
    finally:
        conn.close()


def execute_query(query: str, params: Optional[Iterable[Any]] = None) -> list[dict[str, Any]]:
    """
    Ejecuta un SELECT y devuelve los registros como diccionarios.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return []
        columns = [desc[0] for desc in cur.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()
