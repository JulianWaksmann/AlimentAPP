import json


def lambda_handler(event, context):
    return {"ok": True, "api": "ejecutar-sql", "status": "ready"}


def http_handler(event, context):
    try:
        body_in = json.loads((event.get("body") or "{}")) if isinstance(event, dict) else {}
    except Exception:
        body_in = {}
    result = lambda_handler(body_in, context)
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(result, ensure_ascii=False),
    }
