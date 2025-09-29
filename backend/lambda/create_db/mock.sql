-- ----------------------------------------------------------------------------
-- ROLES
-- ----------------------------------------------------------------------------
INSERT INTO rol (nombre) VALUES 
('supervisor'),
('gerente'),
('vendedor');

-- ----------------------------------------------------------------------------
-- EMPLEADOS
-- ----------------------------------------------------------------------------
INSERT INTO empleado (dni, email, id_rol, nombre, apellido, telefono, activo) VALUES
(35123456, 'maria.rodriguez@frozen.com',  1, 'Maria', 'Rodriguez', '11-2345-6789', true),
(28987654, 'carlos.lopez@frozen.com', 2, 'Carlos', 'Lopez', '11-8765-4321', true),
(42567890, 'ana.garcia@frozen.com',  3, 'Ana', 'Garcia', '11-5555-1234', true);

-- ----------------------------------------------------------------------------
-- PRODUCTOS CONGELADOS
-- ----------------------------------------------------------------------------
INSERT INTO producto (nombre, descripcion, unidad_medida, stock_actual, precio_venta, activo) VALUES
('Empanadas de Carne x12', 'Empanadas congeladas de carne cortada a cuchillo, masa casera', 'unidad', 150, 2800.00, true),
('Hamburguesas Premium x4', 'Hamburguesas de carne premium 150g c/u, congeladas', 'pack', 80, 3500.00, true),
('Pizza Muzzarella Grande', 'Pizza congelada de muzzarella, masa madre, 30cm', 'unidad', 45, 1950.00, true),
('Milanesas de Pollo x6', 'Milanesas de pollo rebozadas, congeladas listas para freír', 'pack', 60, 2400.00, true),
('Tarta de Verdura', 'Tarta congelada de acelga y ricota, masa casera', 'unidad', 35, 1800.00, true);

-- ----------------------------------------------------------------------------
-- MATERIAS PRIMAS (Ingredientes + Envoltorios)
-- ----------------------------------------------------------------------------
INSERT INTO materia_prima (nombre, expirabile) VALUES
-- Ingredientes
('Carne picada especial', true),
('Harina 000', false),
('Huevos frescos', true),
('Cebolla', true),
('Muzzarella', true),
('Pollo trozado', true),
('Pan rallado', false),
('Acelga', true),
('Ricota', true),
('Manteca', true),
('Sal fina', false),
('Condimentos varios', false),
-- Envoltorios y packaging
('Film plástico para congelados', false),
('Bandejas de telgopor', false),
('Bolsas de polietileno x12', false),
('Cajas de cartón p/pizza', false),
('Film stretch industrial', false),
('Etiquetas adhesivas', false),
('Bolsas ziplock grandes', false);

-- ----------------------------------------------------------------------------
-- PROVEEDORES
-- ----------------------------------------------------------------------------
INSERT INTO proveedor (razon_social, cuil, nombre_contacto, direccion, telefono, email, activo) VALUES
('Frigorífico San Miguel SA', '30-12345678-9', 'Roberto Martinez', 'Av. Industrial 1234, Quilmes', '11-4567-8901', 'ventas@frigosanmiguel.com', true),
('Lácteos La Pampa SRL', '30-23456789-0', 'Laura Fernandez', 'Ruta 5 Km 45, General Pico', '2302-456789', 'comercial@lacteolapampa.com', true),
('Distribuidora El Trigal', '27-34567890-1', 'Miguel Gonzalez', 'Calle Maipú 567, San Isidro', '11-7890-1234', 'pedidos@eltrigal.com', true),
('Verduras Frescas Norte', '23-45678901-2', 'Carmen Silva', 'Mercado Central Lote 15', '11-2345-9876', 'ventas@verdurasnorte.com', true),
('Packaging Solutions SA', '30-55667788-3', 'Gabriel Moreno', 'Parque Industrial Pilar Lote 8', '11-5566-7788', 'ventas@packagingsolutions.com', true),
('Carnicería Premium SRL', '27-44556677-2', 'Diana Herrera', 'Av. Corrientes 2890, CABA', '11-4455-6677', 'comercial@carnespremium.com', true),
('Insumos Gastronómicos Del Sur', '30-33445566-1', 'Raul Vega', 'Ruta 3 Km 120, Ezeiza', '11-3344-5566', 'pedidos@insumosdelsur.com', true);

-- ----------------------------------------------------------------------------
-- RECETAS (Materia Prima por Producto)
-- ----------------------------------------------------------------------------

-- Empanadas de Carne x12
INSERT INTO materia_prima_por_producto (id_producto, id_materia_prima, cantidad, kilogramos) VALUES
(1, 1, 1, 0.60),  -- Carne picada especial
(1, 2, 1, 0.30),  -- Harina 000
(1, 4, 1, 0.15),  -- Cebolla
(1, 10, 1, 0.05), -- Manteca
(1, 11, 1, 0.01), -- Sal fina
(1, 12, 1, 0.05), -- Condimentos varios
(1, 15, 1, 0.02), -- Bolsas de polietileno x12
(1, 18, 2, 0.05); -- Etiquetas adhesivas

-- Hamburguesas Premium x4
INSERT INTO materia_prima_por_producto (id_producto, id_materia_prima, cantidad, kilogramos) VALUES
(2, 1, 1, 0.60),  -- Carne picada especial
(2, 3, 2, 0.10),  -- Huevos frescos
(2, 7, 1, 0.05),  -- Pan rallado
(2, 11, 1, 0.05), -- Sal fina
(2, 12, 1, 0.05), -- Condimentos varios
(2, 14, 1, 0.15), -- Bandejas de telgopor
(2, 13, 1, 0.01), -- Film plástico para congelados
(2, 18, 1, 0.02); -- Etiquetas adhesivas

-- Pizza Muzzarella Grande
INSERT INTO materia_prima_por_producto (id_producto, id_materia_prima, cantidad, kilogramos) VALUES
(3, 2, 1, 0.25),  -- Harina 000
(3, 5, 1, 0.20),  -- Muzzarella
(3, 11, 1, 0.05), -- Sal fina
(3, 12, 1, 0.03), -- Condimentos varios
(3, 16, 1, 0.08), -- Cajas de cartón p/pizza
(3, 13, 1, 0.08), -- Film plástico para congelados
(3, 18, 1, 0.02); -- Etiquetas adhesivas

-- Milanesas de Pollo x6
INSERT INTO materia_prima_por_producto (id_producto, id_materia_prima, cantidad, kilogramos) VALUES
(4, 6, 1, 0.90),  -- Pollo trozado
(4, 3, 3, 0.15),  -- Huevos frescos
(4, 7, 1, 0.10),  -- Pan rallado
(4, 11, 1, 0.05), -- Sal fina
(4, 14, 1, 0.18), -- Bandejas de telgopor
(4, 17, 1, 0.12), -- Film stretch industrial
(4, 18, 1, 0.02); -- Etiquetas adhesivas

-- Tarta de Verdura
INSERT INTO materia_prima_por_producto (id_producto, id_materia_prima, cantidad, kilogramos) VALUES
(5, 2, 1, 0.20),  -- Harina 000
(5, 8, 1, 0.40),  -- Acelga
(5, 9, 1, 0.25),  -- Ricota
(5, 3, 2, 0.10),  -- Huevos frescos
(5, 10, 1, 0.05), -- Manteca
(5, 11, 1, 0.05), -- Sal fina
(5, 19, 1, 0.025), -- Bolsas ziplock grandes
(5, 13, 1, 0.08), -- Film plástico para congelados
(5, 18, 1, 0.02); -- Etiquetas adhesivas

-- ----------------------------------------------------------------------------
-- RELACIÓN PROVEEDORES - MATERIAS PRIMAS (con precios y competencia)
-- ----------------------------------------------------------------------------
INSERT INTO proveedor_por_materia_prima (id_proveedor, id_materia_prima, precio, tiempo_entrega_promedio, activo) VALUES
-- Frigorífico San Miguel SA
(1, 1, 850.00, 2, true),  -- Carne picada especial
(1, 6, 950.00, 2, true),  -- Pollo trozado

-- Lácteos La Pampa SRL
(2, 3, 45.00, 1, true),   -- Huevos frescos
(2, 5, 1200.00, 3, true), -- Muzzarella
(2, 9, 680.00, 2, true),  -- Ricota
(2, 10, 750.00, 2, true), -- Manteca

-- Distribuidora El Trigal
(3, 2, 320.00, 7, true),  -- Harina 000
(3, 7, 180.00, 5, true),  -- Pan rallado
(3, 11, 95.00, 7, true),  -- Sal fina
(3, 12, 450.00, 7, true), -- Condimentos varios

-- Verduras Frescas Norte
(4, 4, 150.00, 1, true),  -- Cebolla
(4, 8, 280.00, 1, true),  -- Acelga

-- Packaging Solutions SA (especialista en envases)
(5, 13, 180.00, 3, true), -- Film plástico para congelados
(5, 14, 85.00, 2, true),  -- Bandejas de telgopor
(5, 15, 120.00, 3, true), -- Bolsas de polietileno x12
(5, 16, 45.00, 2, true),  -- Cajas de cartón p/pizza
(5, 17, 220.00, 3, true), -- Film stretch industrial
(5, 18, 65.00, 5, true),  -- Etiquetas adhesivas
(5, 19, 150.00, 3, true), -- Bolsas ziplock grandes

-- Carnicería Premium SRL (competencia en carnes - más caro pero más rápido)
(6, 1, 870.00, 1, true),  -- Carne picada especial (+$20, 1 día)
(6, 6, 980.00, 1, true),  -- Pollo trozado (+$30, 1 día)

-- Insumos Gastronómicos Del Sur (competencia - más barato pero más lento)
(7, 2, 310.00, 5, true),  -- Harina 000 (-$10)
(7, 7, 175.00, 4, true),  -- Pan rallado (-$5)
(7, 11, 90.00, 5, true),  -- Sal fina (-$5)
(7, 12, 430.00, 5, true), -- Condimentos varios (-$20)
(7, 13, 185.00, 4, true), -- Film plástico para congelados (+$5)
(7, 18, 60.00, 7, true);  -- Etiquetas adhesivas (-$5, más lento)

-- ----------------------------------------------------------------------------
-- CLIENTES
-- ----------------------------------------------------------------------------
INSERT INTO cliente (razon_social, email, cuil, nombre_contacto, apellido_contacto, telefono, activo) VALUES
('Supermercado Don Carlos', 'compras@doncarlos.com', '30-98765432-1', 'Pedro', 'Ramirez', '11-9876-5432', true),
('Restaurante La Cocina Gourmet', 'pedidos@cocinagourmet.com', '27-87654321-0', 'Sofia', 'Morales', '11-6543-2109', true),
('Distribuidora Zona Norte SRL', 'ventas@zonanorte.com', '30-76543210-9', 'Lucas', 'Fernandez', '11-3210-9876', true);

-- ----------------------------------------------------------------------------
-- SESIONES ACTIVAS
-- ----------------------------------------------------------------------------
INSERT INTO sesion (id_empleado, password) VALUES
(1, 'contramaria'),     -- Maria Rodriguez (supervisor)
(2, 'contracarlos'),    -- Carlos Lopez (gerente)
(3, 'anabanana');       -- Ana Garcia (vendedor)

-- ----------------------------------------------------------------------------
-- ÓRDENES DE VENTA
-- ----------------------------------------------------------------------------
INSERT INTO orden_venta (id_cliente, id_empleado, fecha_pedido, fecha_entrega_solicitada, fecha_entrega_real, estado, valor_total_pedido, observaciones) VALUES
-- Orden 1: ENTREGADA
(1, 3, '2025-09-20 10:30:00-03', '2025-09-23 08:00:00-03', '2025-09-23 07:45:00-03', 'entregada', 14000.00, 'Pedido semanal regular - entregado sin problemas'),

-- Orden 2: EN PRODUCCION
(2, 3, '2025-09-25 14:15:00-03', '2025-09-28 18:00:00-03', NULL, 'en_produccion', 8750.00, 'Pedido especial para evento del fin de semana'),

-- Orden 3: CONFIRMADA
(3, 3, '2025-09-27 09:00:00-03', '2025-09-30 12:00:00-03', NULL, 'confirmada', 21500.00, 'Pedido grande para distribución en zona norte'),

-- Orden 4: PENDIENTE
(1, 3, '2025-09-28 11:20:00-03', '2025-10-01 08:00:00-03', NULL, 'pendiente', 16800.00, 'Pedido adicional por aumento de demanda'),

-- Orden 5: LISTA
(2, 3, '2025-09-26 16:45:00-03', '2025-09-29 17:00:00-03', NULL, 'lista', 5950.00, 'Pedido urgente - listo para retiro');

-- ----------------------------------------------------------------------------
-- ÓRDENES DE PRODUCCIÓN
-- ----------------------------------------------------------------------------
INSERT INTO orden_produccion (id_orden_venta, id_producto, fecha_creacion, fecha_fin, estado, cantidad, observaciones) VALUES
-- Para Orden de Venta 1 (ENTREGADA) - producciones finalizadas
(1, 1, '2025-09-20', '2025-09-22 18:30:00-03', 'en_proceso', 5, 'Lote de empanadas - completado'),
(1, 3, '2025-09-20', '2025-09-22 20:15:00-03', 'en_proceso', 3, 'Pizzas para supermercado - completado'),
(1, 4, '2025-09-21', '2025-09-22 19:45:00-03', 'en_proceso', 4, 'Milanesas de pollo - completado'),

-- Para Orden de Venta 2 (EN PRODUCCION) - en proceso
(2, 2, '2025-09-25', NULL, 'en_proceso', 2, 'Hamburguesas premium para evento - en proceso'),
(2, 5, '2025-09-25', NULL, 'en_proceso', 1, 'Tarta de verdura especial - en proceso'),

-- Para Orden de Venta 3 (CONFIRMADA) - planificadas
(3, 1, '2025-09-27', NULL, 'planificada', 10, 'Gran lote de empanadas para distribución'),
(3, 2, '2025-09-27', NULL, 'planificada', 8, 'Hamburguesas para distribuidora'),
(3, 3, '2025-09-27', NULL, 'planificada', 6, 'Pizzas para distribuidora'),
(3, 4, '2025-09-27', NULL, 'planificada', 7, 'Milanesas para distribuidora'),

-- Para Orden de Venta 5 (LISTA) - producción completada
(5, 1, '2025-09-26', '2025-09-28 16:30:00-03', 'en_proceso', 2, 'Empanadas urgentes - listas'),
(5, 4, '2025-09-26', '2025-09-28 17:15:00-03', 'en_proceso', 1, 'Milanesas urgentes - listas');

