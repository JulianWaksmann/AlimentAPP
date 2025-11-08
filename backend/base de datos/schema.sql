DROP TYPE IF EXISTS estado_orden_venta;
CREATE TYPE estado_orden_venta AS ENUM (
    'pendiente',
    'pendiente_supervision',
    'confirmada',
    'cancelada',
    'en_produccion',
    'lista',
    'asignada_para_Envio', -- NO SE USA
    'asignada_para_envio_temp' -- NO SE USA, 
    'asignada_para_envio',  
    'despachado',
    'entregada'
);

DROP TYPE IF EXISTS estado_lote_materia_prima;
CREATE TYPE estado_lote_materia_prima AS ENUM (
    'en_cuarentena',
    'disponible',
    'agotado',
    'vencido',
    'rechazado',
    'pedido_generado',
    'cancelado'
);

DROP TYPE IF EXISTS estado_orden_produccion;
CREATE TYPE estado_orden_produccion AS ENUM (
    'pendiente',
    'planificada',
    'lista_para_produccion',
    'en_proceso',
    'cancelada',
    'finalizada'
);

DROP TYPE IF EXISTS estado_tanda_produccion;
CREATE TYPE estado_tanda_produccion AS ENUM (
    'planificada',
    'en_progreso',
    'completada',
    'cancelada'
);

DROP TYPE IF EXISTS unidad_medida;
CREATE TYPE unidad_medida AS ENUM (
    'unidad',
    'kilogramos',
    'litros',
    'metros'
);

--DROP TYPE IF EXISTS estado_produccion_linea;
--CREATE TYPE estado_produccion_linea AS ENUM (
--    'lista_para_produccion',
--    'en_proceso',
--    'finalizada'
--);

DROP TYPE IF EXISTS zona;
CREATE TYPE zona AS ENUM (
    'zona norte',
    'zona sur',
    'zona este',
    'zona oeste'
);

DROP TYPE IF EXISTS estado_envio;
CREATE TYPE estado_envio AS ENUM (
    'pendiente', 
    'despachado', 
    'en_viaje', 
    'entregado', 
    'cancelado'
);

CREATE TYPE tipo_unidad_transporte AS ENUM (
    'camioneta', 
    'auto', 
    'camion'
);

CREATE TABLE IF NOT EXISTS rol (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(15) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS empleado (
    id SERIAL PRIMARY KEY,
    dni INTEGER NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    id_rol INTEGER NOT NULL REFERENCES rol(id),
    nombre VARCHAR(20) NOT NULL,
    apellido VARCHAR(20) NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
);

CREATE TABLE IF NOT EXISTS cliente (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    cuil VARCHAR(50) NOT NULL UNIQUE,
    nombre_contacto VARCHAR(20),
    apellido_contacto VARCHAR(20),
    telefono VARCHAR(20),
    id_direccion_principal INT REFERENCES direccion(id),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    peso_unitario_kg NUMERIC(10,3) NOT NULL CHECK (peso_unitario_kg > 0),
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linea_produccion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    capacidad_maxima_kg NUMERIC(10,2) NOT NULL CHECK (capacidad_maxima_kg > 0),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
);

-- Tabla para matchear que productos son compatibles con que linea de produccion
CREATE TABLE IF NOT EXISTS producto_por_linea_produccion (
    id SERIAL PRIMARY KEY,
    id_linea_produccion INTEGER NOT NULL REFERENCES linea_produccion(id) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    UNIQUE (id_linea_produccion, id_producto)
);

CREATE TABLE IF NOT EXISTS materia_prima (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    unidad_medida VARCHAR(20) NOT NULL,
    cantidad_por_unidad_compra NUMERIC(10,3) NOT NULL DEFAULT 1,
    expirabile BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedor (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(50) NOT NULL,
    cuil VARCHAR(50) NOT NULL UNIQUE,
    nombre_contacto VARCHAR(50),
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(150),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lote_materia_prima (
    id SERIAL PRIMARY KEY,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    id_proveedor INTEGER REFERENCES proveedor(id),
    codigo_lote VARCHAR(50) NOT NULL,
    fecha_ingreso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_vencimiento DATE,
    cantidad_total NUMERIC(10,2) NOT NULL CHECK (cantidad_unitaria_total >= 0),
    cantidad_unitaria_disponible NUMERIC(10,2) NOT NULL CHECK (cantidad_unitaria_disponible >= 0 AND cantidad_unitaria_disponible <= cantidad_unitaria_total),
    estado estado_lote_materia_prima NOT NULL DEFAULT 'en_cuarentena',
    observaciones TEXT,
    fecha_generacion_pedido TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),    -- cuando el sistema automaticamente lo pide
    UNIQUE (codigo_lote, id_materia_prima)
);

CREATE TABLE IF NOT EXISTS orden_venta (
    id SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id),
    id_empleado INTEGER REFERENCES empleado(id),
    fecha_pedido TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_entrega_solicitada TIMESTAMP WITH TIME ZONE,
    fecha_entrega_real TIMESTAMP WITH TIME ZONE,
    estado estado_orden_venta NOT NULL DEFAULT 'pendiente',
    valor_total_pedido NUMERIC(10,2) NOT NULL DEFAULT 0,
    con_envio BOOLEAN DEFAULT FALSE,
    id_direccion_entrega INT REFERENCES direccion(id);
    observaciones TEXT,
    prioritario BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE planificacion_diaria (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    id_orden_produccion INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orden_produccion (
    id SERIAL PRIMARY KEY,
    id_orden_venta INTEGER REFERENCES orden_venta(id) ON DELETE SET NULL,
    id_producto INTEGER NOT NULL REFERENCES producto(id),
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado estado_orden_produccion NOT NULL DEFAULT 'planificada',
    cantidad INTEGER,
    observaciones TEXT
);
CREATE TABLE IF NOT EXISTS materia_prima_por_orden_produccion (
    id SERIAL PRIMARY KEY,
    id_lote_materia_prima INTEGER NOT NULL REFERENCES lote_materia_prima(id) ON DELETE RESTRICT,
    id_orden_produccion INTEGER NOT NULL REFERENCES orden_produccion(id) ON DELETE CASCADE,
    cantidad_utilizada NUMERIC(10,2) NOT NULL CHECK (cantidad_utilizada > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id_orden_produccion, id_lote_materia_prima)
);

CREATE TABLE IF NOT EXISTS tanda_produccion (
    id SERIAL PRIMARY KEY,
    orden_produccion_id INTEGER NOT NULL REFERENCES orden_produccion(id) ON DELETE CASCADE,
    linea_produccion_id INTEGER NOT NULL REFERENCES linea_produccion(id),
    cantidad_kg NUMERIC(10,2) NOT NULL CHECK (cantidad_kg > 0),
    estado estado_tanda_produccion NOT NULL DEFAULT 'planificada',
    secuencia_en_linea INTEGER NOT NULL CHECK (secuencia_en_linea > 0),
    tiempo_estimado_min INTEGER,
    fecha_inicio_planificada TIMESTAMP WITH TIME ZONE,
    fecha_fin_planificada TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tanda_produccion_orden
    ON tanda_produccion (orden_produccion_id);

CREATE INDEX IF NOT EXISTS idx_tanda_produccion_linea_estado
    ON tanda_produccion (linea_produccion_id, estado, secuencia_en_linea);

CREATE TABLE IF NOT EXISTS materia_prima_por_producto (
    id SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    cantidad_unitaria NUMERIC(10,2),
    UNIQUE (id_producto, id_materia_prima)
);

CREATE TABLE IF NOT EXISTS proveedor_por_materia_prima (
    id SERIAL PRIMARY KEY,
    id_proveedor INTEGER NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    precio NUMERIC(10,2) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_proveedor, id_materia_prima)
);


CREATE TABLE codigo_verification (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_expiracion TIMESTAMP NOT NULL,
    utilizado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sesion (
    id_empleado INTEGER PRIMARY KEY REFERENCES empleado(id) ON DELETE CASCADE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE direccion (
  id SERIAL PRIMARY KEY,
  id_cliente INT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  direccion_text TEXT NOT NULL,
  zona zona,
  latitud DECIMAL(10,6),
  longitud DECIMAL(10,6),
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
--Crear el índice único parcial para la dirección principal
CREATE UNIQUE INDEX unique_direccion_principal 
ON direccion (id_cliente) 
WHERE es_principal = true;

CREATE TABLE vehiculo (
    id SERIAL PRIMARY KEY,
    empresa TEXT,
    nombre_conductor TEXT,
    apellido_conductor TEXT,
    dni_conductor TEXT,
    tipo_unidad tipo_unidad_transporte NOT NULL,
    patente TEXT NOT NULL UNIQUE,
    modelo TEXT NOT NULL,
    capacidad_kg INTEGER NOT NULL CHECK (capacidad_kg > 0),
    color TEXT,
    disponible BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE envio (
    id SERIAL PRIMARY KEY,
    id_orden_venta INTEGER NOT NULL REFERENCES orden_venta(id),
    id_vehiculo INTEGER REFERENCES vehiculo(id),
    estado estado_envio NOT NULL DEFAULT 'pendiente',
    fecha_despacho TIMESTAMP WITH TIME ZONE,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    porcentaje_entrega NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


--------------------------------------------------------------------------------------
---------------------------------- VISTAS -------------------------------------------
--------------------------------------------------------------------------------------

------------------ Vista para ver ordenes de produccion incompletas------------------
CREATE OR REPLACE VIEW ordenes_produccion_incompletas AS

WITH Requerimientos AS (
    SELECT
        op.id AS id_orden_produccion,
        mpp.id_materia_prima,
        (op.cantidad * mpp.cantidad_unitaria) AS cantidad_requerida
    FROM
        orden_produccion op
    JOIN
        materia_prima_por_producto mpp ON op.id_producto = mpp.id_producto
    WHERE
        -- Solo nos interesan las órdenes que aún no están finalizadas o canceladas.
        op.estado IN ('pendiente', 'planificada', 'lista_para_produccion', 'en_proceso')
),
Asignaciones AS (
    SELECT
        mpop.id_orden_produccion,
        lmp.id_materia_prima,
        SUM(mpop.cantidad_utilizada) AS cantidad_asignada
    FROM
        materia_prima_por_orden_produccion mpop
    JOIN
        lote_materia_prima lmp ON mpop.id_lote_materia_prima = lmp.id
    GROUP BY
        mpop.id_orden_produccion, lmp.id_materia_prima
),
FaltantesDetallados AS (
    SELECT
        r.id_orden_produccion,
        r.id_materia_prima,
        -- Calculamos la diferencia entre lo requerido y lo asignado.
        (r.cantidad_requerida - COALESCE(a.cantidad_asignada, 0)) AS cantidad_faltante
    FROM
        Requerimientos r
    LEFT JOIN
        Asignaciones a ON r.id_orden_produccion = a.id_orden_produccion
                      AND r.id_materia_prima = a.id_materia_prima
    WHERE
        -- El criterio clave: la orden está incompleta si lo asignado es menor que lo requerido.
        COALESCE(a.cantidad_asignada, 0) < r.cantidad_requerida
)
SELECT
    f.id_orden_produccion,
    JSONB_AGG(
        JSONB_OBJECT(
            ARRAY[mp.nombre],
            ARRAY[f.cantidad_faltante::text]
        )
    ) AS materias_primas_faltantes
FROM
    FaltantesDetallados f
JOIN
    materia_prima mp ON f.id_materia_prima = mp.id
GROUP BY
    f.id_orden_produccion;



------------------ Vista para ver cuanto nos falta por materia prima ------------------
CREATE OR REPLACE VIEW vista_faltantes_globales_mp AS

-- Paso 1: Calculamos el requerimiento total de cada materia prima para todas las órdenes activas.
WITH RequerimientosTotales AS (
    SELECT
        mpp.id_materia_prima,
        SUM(op.cantidad * mpp.cantidad_unitaria) AS cantidad_total_requerida
    FROM
        orden_produccion op
    JOIN
        materia_prima_por_producto mpp ON op.id_producto = mpp.id_producto
    WHERE
        -- Consideramos solo órdenes que consumirán stock en el futuro.
        op.estado IN ('pendiente', 'planificada', 'lista_para_produccion', 'en_proceso')
    GROUP BY
        mpp.id_materia_prima
),

-- Paso 2: Obtenemos el stock disponible actual de la vista que ya tenés.
StockActual AS (
    SELECT
        id_materia_prima,
        cantidad_disponible
    FROM
        cantidad_disponible_materia_prima
)

-- Paso 3: Comparamos lo requerido vs. lo disponible y mostramos solo lo que falta.
SELECT
    r.id_materia_prima,
    mp.nombre AS nombre_materia_prima,
    r.cantidad_total_requerida,
    COALESCE(s.cantidad_disponible, 0) AS cantidad_disponible,
    -- La resta nos da exactamente cuánto nos falta para cubrir toda la demanda.
    (r.cantidad_total_requerida - COALESCE(s.cantidad_disponible, 0)) AS cantidad_faltante
FROM
    RequerimientosTotales r
JOIN
    materia_prima mp ON r.id_materia_prima = mp.id
LEFT JOIN
    StockActual s ON r.id_materia_prima = s.id_materia_prima
WHERE
    -- Mostramos únicamente las materias primas donde la demanda supera al stock.
    r.cantidad_total_requerida > COALESCE(s.cantidad_disponible, 0);
