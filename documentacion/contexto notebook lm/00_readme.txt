NotebookLM Context Overview
===========================

Archivos incluidos
------------------
- 01_schema_postgres.txt: DDL completo de PostgreSQL con enums y relaciones actualizadas.
- 02_data_dictionary.txt: descripcion en lenguaje natural de tablas, campos y estados.
- 03_flujo_orden_venta.txt: flujo desde la creacion de la orden de venta hasta la entrega final.
- 04_flujo_materia_prima.txt: flujo de abastecimiento y control de lotes de materia prima.
- 05_flujo_asignacion_materia_prima.txt: algoritmo automatico de asignacion de lotes a OPs (solo interviene calidad cargando lotes).\n- 06_flujo_planificacion_lineas.txt: particion y agenda de tandas de 3 horas por linea.

Uso sugerido en NotebookLM
--------------------------
1. Crear un notebook y subir los archivos (TXT sin compresion).
2. Renombrar cada fuente con un titulo claro para facilitar referencias (ej. "Flujo Orden Venta").
3. Al iniciar la conversacion con el chatbot, indicarle que cite siempre el documento y el apartado utilizado.
4. Para preguntas sobre procesos, consultar primero los flujos (03, 04, 05, 06); para datos, usar 01 y 02.
5. Actualizar esta carpeta cada vez que cambie la documentacion oficial.

Notas
-----
- Todo el contenido esta en ASCII para evitar problemas de encoding.
- Los flujos hacen referencia cruzada entre si a traves del apartado "Documentos relacionados".
- La asignacion de materia prima es 100% automatica; la unica accion manual es el alta/lote por parte del encargado de calidad.

