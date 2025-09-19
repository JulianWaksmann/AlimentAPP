# Frozen (AlimentAPP)

Proyecto estudiantil para un sistema web de trazabilidad y producción usando únicamente: Route 53, CloudFront, S3, API Gateway (HTTP API), VPC, Lambda (Python) y RDS (PostgreSQL/MySQL). Lambdas en VPC sin acceso a internet, invocadas solo por API Gateway.

## Estructura
- `backend/`: código backend en Python (módulos y capa común). CFN se agregará más adelante.
- `frontend/`: código del frontend web. CFN se agregará más adelante.

## Lineamientos del Repositorio

### Ramas y Flujo de Trabajo
- Ramas principales: `master` (estable/releases) y `develop` (integración continua).
- Feature branches: `feature/<breve-descripcion>` a partir de `develop` → merge por PR a `develop`.
- Hotfix: `hotfix/<issue>` a partir de `master` → PR a `master` y luego merge back a `develop`.
- Release: PR de `develop` → `master` cuando se corta versión y se despliega.

### Commits y Pull Requests
- Convención de mensajes (Conventional Commits):
  - `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `ci: ...`
- PRs: título claro, descripción con “qué” y “por qué”, checklist de pruebas manuales.
- Requisito: al menos 1 review antes de merge en `master` y `develop` (regla de protección en GitHub).
- Merge strategy: squash & merge para features; merge commit para releases si se requiere preservar historia.

### Versionado y Releases
- Versionado Semántico (SemVer): `MAJOR.MINOR.PATCH`.
- Tags en `master` para releases: `v0.1.0`, `v0.1.1`, etc.
- Changelog en el PR de release (resumen de cambios destacados).

### Estándares de Código (Python)
- Estilo: PEP8. Formateo recomendado con `black` y `isort` (opcional para este proyecto).
- Tipado: hints cuando aporte claridad (no obligatorio en todo el código).
- Estructura por módulos de dominio en `src/lambdas/` y utilitarios en `src/layers/common`.
- Evitar dependencias que requieran acceso a internet en runtime (Lambdas sin internet).

### Infraestructura como Código (CloudFormation)
- Plantillas en `cfn/` separadas por dominio: `network-db.yaml`, `backend.yaml`, `frontend.yaml`.
- Parámetros sensibles con `NoEcho` (p. ej. `DBPassword`, `JwtSecret`).
- Nombres de stacks sugeridos: `alimentapp-network`, `alimentapp-backend`, `alimentapp-frontend`.
- Región objetivo: definir explícitamente al desplegar (ej. `--region us-east-1`).

### Seguridad y Secretos
- Nunca commitear secretos (.env, contraseñas, tokens). Mantenerlos como parámetros en CFN o variables de entorno.
- RDS privado sin acceso público; tráfico permitido solo desde SG de Lambdas.
- S3 bloqueado público; acceso a través de CloudFront con OAC.

### Convenciones de Nombres
- Recursos: prefijo `alimentapp-<componente>` (ej.: `alimentapp-vpc`, `alimentapp-rds-sg`).
- Ramas: `feature/*`, `hotfix/*`, `release/*` (si se usa).
- Endpoints API: `/api/<dominio>/<recurso>` (mobile-first y REST simples).

### Checklist de PRs
- [ ] Compila/valida localmente (si aplica).
- [ ] Se actualizaron plantillas CFN o README si cambia infraestructura.
- [ ] Sin secretos en cambios.
- [ ] Pruebas manuales básicas descritas en el PR (endpoints afectados).

### Entornos (mínimo)
- `dev` y `prod` en la misma cuenta para la cursada (stacks con sufijo `-dev` y `-prod` si se duplica).
- Despliegues manuales con CLI al inicio; automatización puede agregarse más adelante.

## Despliegue (orientativo)
1) Red y base de datos (elige parámetros):

```
aws cloudformation deploy \
  --stack-name alimentapp-network \
  --template-file cfn/network-db.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    VpcCidr=10.20.0.0/16 \
    DBName=frozen \
    DBUser=admin \
    DBPassword=CHANGE_ME \
    DBEngine=postgres \
    DBInstanceClass=db.t4g.micro
```

Guarda los Outputs (VpcId, PrivateSubnetIds, RdsEndpointAddress, RdsSecurityGroupId, RdsPort).

2) Backend (API + Lambdas):

```
aws cloudformation deploy \
  --stack-name alimentapp-backend \
  --template-file cfn/backend.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    VpcId=<VpcId> \
    PrivateSubnetIds=<subnet-1,subnet-2> \
    RdsSecurityGroupId=<sg-...> \
    RdsEndpointAddress=<endpoint> \
    RdsPort=<5432_or_3306> \
    DBName=frozen \
    DBUser=admin \
    DBPassword=CHANGE_ME \
    JwtSecret=CHANGE_ME
```

3) Frontend (S3 + CloudFront):

```
aws cloudformation deploy \
  --stack-name alimentapp-frontend \
  --template-file cfn/frontend.yaml \
  --parameter-overrides \
    ApiDomainName=<xxxx.execute-api.<region>.amazonaws.com>
```

Luego subí el build del frontend a S3 (bucket output `SiteBucketName`).

## Notas importantes
- Sin NAT: las Lambdas no podrán llamar a internet ni a servicios públicos. Deben limitarse a RDS.
- Logs: las Lambdas siguen enviando stdout/stderr a CloudWatch sin requerir NAT.
- Credenciales: en este proyecto estudiantil van en parámetros/variables (NoEcho). En producción usarías Secrets/SSM.
- Driver DB: elegí PostgreSQL (pg8000, puro Python) o MySQL (PyMySQL). El código común tiene placeholders.

## Próximos pasos
- Definir motor de RDS (PostgreSQL recomendado para usar `pg8000`).
- Completar helpers de DB en `src/layers/common/python/common/db.py` según el motor.
- Crear migraciones SQL iniciales (users, materials, etc.).
- Conectar endpoints reales en cada una de las Lambda.
