# pg8000 Lambda Layer

Crea un Layer reutilizable con el driver `pg8000` para todas las Lambdas que se conectan a RDS PostgreSQL.

## Requisitos
- Python y pip instalados en tu máquina.
- Región objetivo: `us-east-1` (ajústalo si usas otra).

## Construir el ZIP del Layer (Windows PowerShell)
1) Ejecuta el script de build desde la raíz del repo o desde esta carpeta:

```
# Desde la raíz del repo
pwsh -File backend/layers/pg8000/build_layer.ps1
# o, dentro de backend/layers/pg8000
pwsh -File build_layer.ps1
```

2) Resultado: se genera `backend/layers/pg8000/pg8000-layer.zip` con la carpeta `python/` en la raíz.

## Publicar el Layer en AWS (CLI)
```
aws lambda publish-layer-version \
  --layer-name pg8000 \
  --zip-file fileb://backend/layers/pg8000/pg8000-layer.zip \
  --compatible-runtimes python3.12 \
  --region us-east-1
```
- Copia el `LayerVersionArn` del resultado para adjuntarlo a tus Lambdas.

## Adjuntar el Layer a una Lambda (Consola)
- Lambda → tu función → Configuration → Layers → Add a layer → Specify an ARN → pega el ARN publicado.

## Notas
- `pg8000` es 100% Python (sin binarios), ideal para Lambdas sin internet.
- Este layer se comparte entre todas las Lambdas que acceden a RDS.
- Si querés fijar otra versión, cambia la variable `PG8000_VERSION` en el script.
