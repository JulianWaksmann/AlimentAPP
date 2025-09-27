import json
import os
import ssl
from pathlib import Path

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
        import boto3
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


def execute_sql_script(sql_path: Path):
    """
    Ejecuta cada sentencia del script SQL provisto.
    """
    script = sql_path.read_text(encoding="utf-8")
    statements = [stmt.strip() for stmt in script.split(";") if stmt.strip()]

    conn = get_connection()
    try:
        cur = conn.cursor()
        for statement in statements:
            cur.execute(statement)
        conn.commit()
    finally:
        conn.close()


def lambda_handler(event, context):
    """
    Aplica el schema definido en schema.sql sobre la base seleccionada.
    """
    sql_path = Path(__file__).with_name("schema.sql")
    execute_sql_script(sql_path)
    return {"statusCode": 200, "body": "Schema created"}


if __name__ == "__main__":
    event_path = Path(__file__).with_name("event.json")
    event = json.loads(event_path.read_text(encoding="utf-8"))
    response = lambda_handler(event, None)
    print(json.dumps(response, indent=2))
