import json

from .db_utils import execute_query


def lambda_handler(event, context):
    """
    Retorna la lista de empleados ordenada por ID.
    """
    employees = execute_query(
        """
        SELECT id, nombre, apellido, rol, area, turno
        FROM employees
        ORDER BY id
        """
    )

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(employees, default=str),
    }


if __name__ == "__main__":
    from pathlib import Path

    event_path = Path(__file__).with_name("event.json")
    event = json.loads(event_path.read_text(encoding="utf-8"))
    response = lambda_handler(event, None)
    print(json.dumps(response, indent=2))
