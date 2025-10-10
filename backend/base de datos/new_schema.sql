DROP TYPE IF EXISTS estado_orden_venta;
CREATE TYPE estado_orden_venta AS ENUM (
    'pendiente',
    'pendiente_supervision',
    'confirmada',
    'cancelada',
    'en_produccion',
    'lista',
    'entregada'
);

DROP TYPE IF EXISTS estado_lote_materia_prima;
CREATE TYPE estado_lote_materia_prima AS ENUM (
    'en_cuarentena',
    'disponible',
    'agotado',
    'vencido',
    'rechazado',
    'en_espera'
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

DROP TYPE IF EXISTS unidad_medida;
CREATE TYPE unidad_medida AS ENUM (
    'unidad',
    'kilogramos',
    'litros',
    'metros'
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
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cliente (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    cuil VARCHAR(50) NOT NULL UNIQUE,
    nombre_contacto VARCHAR(20),
    apellido_contacto VARCHAR(20),
    telefono VARCHAR(20),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    unidad_medida unidad_medida NOT NULL,
    stock_actual NUMERIC(10,3) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
    umbral_minimo NUMERIC(10,3), --> #NUEVO#
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS linea_produccion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    unidad_medida unidad_medida NOT NULL,
    -- capacidad_maxima_kg NUMERIC(10,2) NOT NULL CHECK (capacidad_maxima_kg > 0),
    capacidad_maxima NUMERIC(10,3) NOT NULL CHECK (capacidad_maxima >= 0), --> #NUEVO#
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    categoria VARCHAR(30)
);

CREATE TABLE capacidad_por_producto ( --> #NUEVO# 
    id_linea_produccion INT REFERENCES linea_produccion(id),
    id_producto INT REFERENCES producto(id),
    ocupacion NUMERIC(10,3) NOT NULL,  -- ej: pizzas = 1.0, empanadas = 0.25
    PRIMARY KEY (id_linea_produccion, id_producto)
);

CREATE TABLE IF NOT EXISTS producto_por_linea_produccion (
    id SERIAL PRIMARY KEY,
    id_linea_produccion INTEGER NOT NULL REFERENCES linea_produccion(id) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    prioridad SMALLINT,
    UNIQUE (id_linea_produccion, id_producto)
);

CREATE TABLE IF NOT EXISTS materia_prima (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    unidad_medida unidad_medida NOT NULL,
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
    codigo_lote VARCHAR(50) UNIQUE WHERE codigo_lote IS NOT NULL,
    fecha_generacion_pedido TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_ingreso TIMESTAMP WITH TIME ZONE,
    fecha_vencimiento DATE,
    cantidad_total NUMERIC(10,3) NOT NULL CHECK (cantidad_total >= 0),
    cantidad_disponible NUMERIC(10,3) NOT NULL CHECK (cantidad_disponible >= 0 AND cantidad_disponible <= cantidad_total),
    estado estado_lote_materia_prima NOT NULL DEFAULT 'en_espera', 
    observaciones TEXT,
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
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orden_produccion (
    id SERIAL PRIMARY KEY,
    id_orden_venta INTEGER REFERENCES orden_venta(id) ON DELETE SET NULL,
    id_producto INTEGER NOT NULL REFERENCES producto(id),
    id_linea_produccion INTEGER REFERENCES linea_produccion(id),
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado estado_orden_produccion NOT NULL DEFAULT 'planificada',
    cantidad NUMERIC(10,3) NOT NULL CHECK (cantidad >= 0),
   -- kg_programados NUMERIC(10,2) CHECK (kg_programados IS NULL OR kg_programados > 0),
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS materia_prima_por_orden_produccion (
    id SERIAL PRIMARY KEY,
    id_lote_materia_prima INTEGER NOT NULL REFERENCES lote_materia_prima(id) ON DELETE RESTRICT,
    id_orden_produccion INTEGER NOT NULL REFERENCES orden_produccion(id) ON DELETE CASCADE,
    cantidad_utilizada NUMERIC(10,3) NOT NULL CHECK (cantidad_utilizada >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id_orden_produccion, id_lote_materia_prima)
);

CREATE TABLE IF NOT EXISTS materia_prima_por_producto (
    id SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10,3) NOT NULL CHECK (cantidad >= 0),
    UNIQUE (id_producto, id_materia_prima)
);

CREATE TABLE IF NOT EXISTS proveedor_por_materia_prima (
    id SERIAL PRIMARY KEY,
    id_proveedor INTEGER NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    precio_bulto NUMERIC(10,2) NOT NULL CHECK (precio_bulto > 0),
    cantidad_por_bulto NUMERIC(10,3) NOT NULL CHECK (cantidad_por_bulto >= 0),
    cantidad_minima_bultos INTEGER NOT NULL CHECK (cantidad_minima_bultos > 0),
    tiempo_entrega_promedio INTEGER,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_proveedor, id_materia_prima)
);
