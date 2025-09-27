import json

from .db_utils import execute_non_query


REQUIRED_FIELDS = {"nombre", "apellido", "rol", "area", "turno"}


def lambda_handler(event, context):
    """
    Inserta un nuevo empleado validando los campos requeridos.
    """
    try:
        payload = event.get("body") or event
        if isinstance(payload, str):
            payload = json.loads(payload)
    except json.JSONDecodeError as exc:
        return {"statusCode": 400, "body": json.dumps({"message": f"Invalid JSON: {exc}"})}

    missing = REQUIRED_FIELDS - payload.keys()
    if missing:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": f"Missing fields: {', '.join(sorted(missing))}"}),
        }

    execute_non_query(
        """
        INSERT INTO employees (nombre, apellido, rol, area, turno)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            payload["nombre"],
            payload["apellido"],
            payload["rol"],
            payload["area"],
            payload["turno"],
        ),
    )

    return {
        "statusCode": 201,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"message": "Employee created"}),
    }


if __name__ == "__main__":
    from pathlib import Path

    event_path = Path(__file__).with_name("event.json")
    event = json.loads(event_path.read_text(encoding="utf-8"))
    response = lambda_handler(event, None)
    print(json.dumps(response, indent=2))
