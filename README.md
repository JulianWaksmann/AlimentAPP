# Core

Proyecto de aplicación integral para PYMES alimenticias, diseñado para optimizar la trazabilidad y la producción. Gestiona eficientemente desde la recepción de materia prima hasta la entrega del producto final.

## Enlaces Útiles
- Chatbot de Documentación: [https://notebooklm.google.com/notebook/580abcc6-6d39-4f7a-a9d9-7fbc39167c87](https://notebooklm.google.com/notebook/580abcc6-6d39-4f7a-a9d9-7fbc39167c87)
- Aplicación Web: [http://webapp-core-system.s3-website-us-east-1.amazonaws.com/](http://webapp-core-system.s3-website-us-east-1.amazonaws.com/)

## Estructura
- `backend/`: código backend en Python (módulos y capa común).
- `frontend/`: código del frontend web.

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

### Seguridad y Secretos
- Nunca commitear secretos (.env, contraseñas, tokens).
- RDS privado sin acceso público; tráfico permitido solo desde SG de Lambdas.
- S3 bloqueado público.

### Convenciones de Nombres
- Recursos: prefijo `alimentapp-<componente>` (ej.: `alimentapp-vpc`, `alimentapp-rds-sg`).
- Ramas: `feature/*`, `hotfix/*`, `release/*` (si se usa).
- Endpoints API: `/api/<dominio>/<recurso>` (mobile-first y REST simples).

### Checklist de PRs
- [ ] Compila/valida localmente (si aplica).
- [ ] Se actualizó README si cambia la arquitectura.
- [ ] Sin secretos en cambios.
- [ ] Pruebas manuales básicas descritas en el PR (endpoints afectados).

### Entornos (mínimo)
- `dev` y `prod` en la misma cuenta para la cursada.
- Despliegues manuales.

## Notas importantes
- Sin NAT: las Lambdas no podrán llamar a internet ni a servicios públicos. Deben limitarse a RDS.
- Logs: las Lambdas siguen enviando stdout/stderr a CloudWatch sin requerir NAT.
- Credenciales: en este proyecto estudiantil van en parámetros/variables. En producción usarías Secrets/SSM.
- Driver DB: PostgreSQL (pg8000, puro Python).

## Próximos pasos
- Completar helpers de DB en `src/layers/common/python/common/db.py`.
- Crear migraciones SQL iniciales.
- Conectar endpoints reales en cada una de las Lambda.
