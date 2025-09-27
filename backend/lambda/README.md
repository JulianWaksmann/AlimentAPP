# Lambda skeleton

Cada Lambda vive en su propia carpeta (mismo nombre que la funcion). Dentro hay:
- lambda_function.py: handler lambda_handler. Incluye un bloque if __name__ == "__main__" para invocarlo localmente cargando un event.json de la misma carpeta.
- db_utils.py: helpers para conectarse a Postgres usando pg8000.
  - get_credentials() intenta primero leer los parametros en AWS Systems Manager Parameter Store (/alimentapp/db/...).
  - Si no encuentra los parametros, recurre a un fallback apuntando al RDS db-alimentapp.cm7oyoiiqchb.us-east-1.rds.amazonaws.com (host, puerto, usuario y password provistos).
  - Ajusta o elimina ese fallback antes de subir a repositorios compartidos.
- schema.sql: solamente en create_db/ para definir el esquema inicial.
- event.json: payload de ejemplo para pruebas locales.

## Estructura actual
- create_db/
  - lambda_function.py
  - schema.sql
  - event.json
- get_employees/
  - db_utils.py
  - lambda_function.py
  - event.json
- create_employee/
  - db_utils.py
  - lambda_function.py
  - event.json
- equirements.txt

## Dependencias
Instala pg8000 (y oto3 para ejecutar el fallback/SSM en local):
`ash
python -m pip install -r backend/lambda/requirements.txt
`

## Probar en local
1. Configura las credenciales necesarias. Puedes:
   - Definir un archivo ~/.aws/credentials con permisos de lectura al Parameter Store.
   - O bien dejar que el helper use el fallback (ver db_utils.get_credentials).
2. Ejecuta cualquier lambda leyendo su event.json por defecto:
   `ash
   python backend/lambda/create_db/lambda_function.py
   python backend/lambda/create_employee/lambda_function.py
   python backend/lambda/get_employees/lambda_function.py
   `
   Si quieres usar otro payload, modifica event.json o reemplazalo antes de ejecutar.

## Desplegar en AWS
1. Sube las credenciales a Parameter Store (/alimentapp/db/host, /password, /port, /username).
2. Elimina o sobreescribe el fallback hardcodeado antes de publicar el codigo.
3. Empaqueta cada carpeta junto con las dependencias en un zip y subelo a Lambda:
   `ash
   cd backend/lambda
   python -m pip install -r requirements.txt -t build
   cp -r create_db/*.py create_db/schema.sql create_db/event.json build/
   (cd build && zip -r ../create_db.zip .)
   `
   Repite cambiando create_db por get_employees, create_employee, etc.
