# ejecutar-sql

Utilidades locales para invocar la Lambda `ejecutar-sql`.

## Archivos
- `invoke_sql.py`: invoca la función con un SQL/params.

## Uso
- Requisitos: `boto3` instalado y credenciales AWS configuradas.
- Ejemplos:
  - `python backend/lambda/scripts/ejecutar-sql/invoke_sql.py --sql "SELECT now()"`
  - `python backend/lambda/scripts/ejecutar-sql/invoke_sql.py --sql "INSERT INTO demo(v) VALUES (%s)" --params "[\"hola\"]"`

Argumentos útiles:
- `--function ejecutar-sql` (por defecto)
- `--region us-east-1` (por defecto)
- `--sql` sentencia SQL
- `--params` JSON con parámetros posicionales
- `--event` archivo JSON con el payload completo (opcional)
