# Planificador de Órdenes de Producción

Esta Lambda es el cerebro de la planificación de la producción. Su objetivo es tomar todas las órdenes de producción pendientes y generar una secuencia de trabajo optimizada en forma de "tandas de producción", respetando las capacidades y prioridades del negocio.

## Conceptos Clave

- **Orden de Producción (OP):** La necesidad de fabricar una cantidad total de un producto. Se expresa en unidades, que luego se convierten a KG.
- **Tanda de Producción:** Una fracción ejecutable de una OP, con un peso específico (`cantidad_kg`), asignada a una línea de producción y con una secuencia. Es la unidad mínima de trabajo para un operario.
- **Capacidad por Tanda (`capacidad_maxima_kg`):** El peso máximo en KG que una línea de producción puede procesar en un único ciclo o "batch". Es un límite físico de la máquina.
- **Capacidad Total del Período:** El peso total en KG que una línea puede producir en el ciclo completo de planificación (ej. un día o turno). Se calcula como: `Capacidad por Tanda * CAPACIDAD_DIARIA_FACTOR`.

## Flujo del Algoritmo

El planificador sigue una estrategia "greedy" (voraz), reactiva y optimizada por urgencia.

### Paso 1: Limpieza del Plan Anterior

En cada ejecución, lo primero que hace el sistema es **borrar todas las tandas que se encuentran en estado `planificada`**. Esto es fundamental para asegurar que el nuevo plan sea siempre el más óptimo posible, ya que permite que nuevas órdenes más urgentes tomen prioridad sobre un plan que aún no ha comenzado a ejecutarse.

### Paso 2: Recopilación y Cálculo de Datos

El sistema reúne toda la información necesaria:
1.  **Líneas Activas:** Obtiene todas las `linea_produccion` que están marcadas como `activa=TRUE`, junto a su `capacidad_maxima_kg`.
2.  **Capacidad Total:** Calcula la "Capacidad Total del Período" para cada línea.
3.  **Órdenes Pendientes:** Busca todas las OP en estado `lista_para_produccion` y calcula los `kg_pendientes` para cada una, restando cualquier cantidad que ya esté en tandas `en_progreso` o `completada`.

### Paso 3: Priorización de Órdenes

Las órdenes de producción pendientes se ordenan para procesar primero las más urgentes. El criterio de ordenamiento es:
1.  Por `fecha_entrega_solicitada` de la orden de venta (la más próxima primero).
2.  En caso de empate, por la fecha de creación de la OP (la más antigua primero).

### Paso 4: Asignación de Tandas

Este es el núcleo del algoritmo. El sistema itera sobre la lista ordenada de OPs y, para cada una, intenta planificar sus `kg_restantes`.

1.  **Selección de Línea (`seleccionar_linea`):**
    - Se buscan las líneas de producción compatibles con el producto de la OP.
    - De esas, se filtran solo aquellas cuya carga ya planificada (`carga_planificada`) sea **menor** a su `capacidad_diaria`.
    - De las líneas restantes, se elige la "más libre", que es aquella con la menor secuencia de tandas y la menor carga ya acumulada.

2.  **Cálculo del Tamaño de la Tanda:**
    - Si se encuentra una línea disponible, se calcula el tamaño de la nueva tanda (`kg_tanda`). Este será el valor **mínimo** de los siguientes tres límites:
        1. Los `kg_restantes` de la orden.
        2. La `capacidad_maxima_kg` de la línea (límite por tanda).
        3. La capacidad diaria que aún le queda a la línea (`capacidad_diaria_restante`).

3.  **Creación y Repetición:**
    - Se crea la nueva `tanda_produccion` en la base de datos.
    - Se actualiza la `carga_planificada` de la línea.
    - El bucle continúa hasta que la orden se completa o hasta que ya no quedan líneas con capacidad disponible en el período.

### Paso 5: Finalización

El proceso termina cuando se han recorrido todas las órdenes. Las órdenes o fracciones de órdenes que no pudieron ser planificadas (porque todas las líneas compatibles alcanzaron su capacidad total) quedarán pendientes y serán consideradas en la siguiente ejecución del planificador.

## Configuración

- **`CAPACIDAD_DIARIA_FACTOR` (Variable de Entorno):** Este número es crucial. Multiplica la capacidad de una tanda para definir la capacidad total de la línea en un período.
  - `Factor = 1`: La capacidad total es igual a la de una sola tanda. La línea solo podrá tener una tanda planificada.
  - `Factor = 4`: La línea podrá planificar un peso total equivalente a 4 veces su capacidad por tanda.

## Salida de la Lambda (`lambda_handler`)

Aunque el algoritmo genera un plan completo en la base de datos, la respuesta de la Lambda principal está diseñada para ser simple y directa. Después de guardar todo el plan, consulta y devuelve **únicamente la información de la siguiente tanda más prioritaria** (la que tiene `secuencia_en_linea` más baja). Esto facilita ofrecer al operario la "próxima tarea inmediata".
