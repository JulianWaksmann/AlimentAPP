DROP TYPE IF EXISTS estado_orden_venta;
CREATE TYPE estado_orden_venta AS ENUM (
    'pendiente',
    'confirmada',
    'cancelada',
    'en_produccion',
    'lista',
    'entregada'
);

DROP TYPE IF EXISTS estado_orden_produccion;
CREATE TYPE estado_orden_produccion AS ENUM (
    'planificada',
    'en_proceso',
    'cancelada'
);

CREATE TABLE IF NOT EXISTS rol (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(15) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS empleado (
    id SERIAL PRIMARY KEY,
    dni INTEGER NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INTEGER NOT NULL REFERENCES rol(id),
    nombre VARCHAR(20) NOT NULL,
    apellido VARCHAR(20) NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login TIMESTAMP WITH TIME ZONE
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
    unidad_medida VARCHAR(20) NOT NULL,
    stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materia_prima (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
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
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado estado_orden_produccion NOT NULL DEFAULT 'planificada',
    cantidad INTEGER,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS materia_prima_por_producto (
    id SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    cantidad INTEGER,
    kilogramos NUMERIC(10,2),
    UNIQUE (id_producto, id_materia_prima)
);

CREATE TABLE IF NOT EXISTS proveedor_por_materia_prima (
    id SERIAL PRIMARY KEY,
    id_proveedor INTEGER NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
    id_materia_prima INTEGER NOT NULL REFERENCES materia_prima(id) ON DELETE RESTRICT,
    precio NUMERIC(10,2) NOT NULL,
    tiempo_entrega_promedio INTEGER,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_proveedor, id_materia_prima)
);

CREATE TABLE IF NOT EXISTS sesion (
    id_empleado INTEGER PRIMARY KEY REFERENCES empleado(id) ON DELETE CASCADE,
    password VARCHAR(255) NOT NULL
);
