Planificador diario (shadow preview)

Resumen
- Lambda separada que ejecuta el mismo algoritmo de planificación en una transacción “sombra” (rollback) y devuelve una vista efímera por días hábiles (L–V), sin persistir cambios en BD.
- Útil para UI: mostrar qué OPs caerían en los próximos N días, respetando compatibilidades y capacidades por línea.

Entradas
- Body JSON: { "dias": N, "desde": "YYYY-MM-DDTHH:MM:SSZ" (opcional) }
- Env: `DB_SCHEMA` (default `dev`), `CAPACIDAD_DIARIA_FACTOR` (default `1`).

Salida
- Lista de objetos: [ { "YYYY-MM-DD": [ { op_id, ov_id, linea_id, producto, kg }, ... ] }, ... ]
- Si una OP se parte en varias tandas el mismo día, aparece repetida.

Notas
- Se usa rollback explícito: la Lambda no deja tandas nuevas en la tabla.
- Capacidad diaria por línea = `capacidad_maxima_kg` * `CAPACIDAD_DIARIA_FACTOR`.

