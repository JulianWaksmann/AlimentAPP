# Frozen (AlimentAPP)

Proyecto estudiantil para un sistema web de trazabilidad y producción usando únicamente: Route 53, CloudFront, S3, API Gateway (HTTP API), VPC, Lambda (Python) y RDS (PostgreSQL/MySQL). Lambdas en VPC sin acceso a internet, invocadas solo por API Gateway.

## Estructura
- `cfn/network-db.yaml`: VPC privada (sin NAT), subredes aisladas, SGs y RDS privado.
- `cfn/backend.yaml`: API Gateway HTTP API, Lambdas por módulo en VPC, capa común, roles y permisos.
- `cfn/frontend.yaml`: S3 + CloudFront con OAC, behavior `/api/*` apuntando a API.
- `src/layers/common`: código compartido (JWT, DB helpers).
- `src/lambdas/{auth,materials,inventory,orders}`: handlers Python por módulo.

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

