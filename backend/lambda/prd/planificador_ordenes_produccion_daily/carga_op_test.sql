\\set ov_base 123
-- Carga masiva de Ã³rdenes de producciÃ³n de prueba (200+ filas)
-- Ajusta el esquema si corresponde
SET search_path TO dev;

SET my.ov_base = '123';

-- ------------------------------------------------------------
-- Ã“rdenes de venta de prueba (29 filas, ids 123..151)
-- Nota: se fija el ID explÃ­citamente para mapear fÃ¡cilmente por grupo.
-- id_cliente se setea en 1 y id_empleado en NULL para simplificar pruebas.
-- fecha_entrega_solicitada escalonada para priorizaciÃ³n del planificador.
-- observaciones = 'test' para permitir limpieza posterior.
INSERT INTO orden_venta (id, id_cliente, id_empleado, fecha_pedido, fecha_entrega_solicitada, estado, valor_total_pedido, observaciones)
VALUES
  (123, 1, NULL, NOW(), NOW() + INTERVAL '5 days',  'confirmada', 0, 'test'),
  (124, 1, NULL, NOW(), NOW() + INTERVAL '2 days',  'confirmada', 0, 'test'),
  (125, 1, NULL, NOW(), NOW() + INTERVAL '20 days',  'confirmada', 0, 'test'),
  (126, 1, NULL, NOW(), NOW() + INTERVAL '35 days',  'confirmada', 0, 'test'),
  (127, 1, NULL, NOW(), NOW() + INTERVAL '4 days',  'confirmada', 0, 'test'),
  (128, 1, NULL, NOW(), NOW() + INTERVAL '5 days',  'confirmada', 0, 'test'),
  (129, 1, NULL, NOW(), NOW() + INTERVAL '6 days',  'confirmada', 0, 'test'),
  (130, 1, NULL, NOW(), NOW() + INTERVAL '7 days',  'confirmada', 0, 'test'),
  (131, 1, NULL, NOW(), NOW() + INTERVAL '8 days',  'confirmada', 0, 'test'),
  (132, 1, NULL, NOW(), NOW() + INTERVAL '9 days',  'confirmada', 0, 'test'),
  (133, 1, NULL, NOW(), NOW() + INTERVAL '10 days', 'confirmada', 0, 'test'),
  (134, 1, NULL, NOW(), NOW() + INTERVAL '10 days', 'confirmada', 0, 'test'),
  (135, 1, NULL, NOW(), NOW() + INTERVAL '22 days', 'confirmada', 0, 'test'),
  (136, 1, NULL, NOW(), NOW() + INTERVAL '13 days', 'confirmada', 0, 'test'),
  (137, 1, NULL, NOW(), NOW() + INTERVAL '24 days', 'confirmada', 0, 'test'),
  (138, 1, NULL, NOW(), NOW() + INTERVAL '10 days', 'confirmada', 0, 'test'),
  (139, 1, NULL, NOW(), NOW() + INTERVAL '26 days', 'confirmada', 0, 'test'),
  (140, 1, NULL, NOW(), NOW() + INTERVAL '17 days', 'confirmada', 0, 'test'),
  (141, 1, NULL, NOW(), NOW() + INTERVAL '18 days', 'confirmada', 0, 'test'),
  (142, 1, NULL, NOW(), NOW() + INTERVAL '19 days', 'confirmada', 0, 'test'),
  (143, 1, NULL, NOW(), NOW() + INTERVAL '20 days', 'confirmada', 0, 'test'),
  (144, 1, NULL, NOW(), NOW() + INTERVAL '21 days', 'confirmada', 0, 'test'),
  (145, 1, NULL, NOW(), NOW() + INTERVAL '22 days', 'confirmada', 0, 'test'),
  (146, 1, NULL, NOW(), NOW() + INTERVAL '23 days', 'confirmada', 0, 'test'),
  (147, 1, NULL, NOW(), NOW() + INTERVAL '24 days', 'confirmada', 0, 'test'),
  (148, 1, NULL, NOW(), NOW() + INTERVAL '25 days', 'confirmada', 0, 'test'),
  (149, 1, NULL, NOW(), NOW() + INTERVAL '26 days', 'confirmada', 0, 'test'),
  (150, 1, NULL, NOW(), NOW() + INTERVAL '27 days', 'confirmada', 0, 'test'),
  (151, 1, NULL, NOW(), NOW() + INTERVAL '28 days', 'confirmada', 0, 'test');

-- Productos y pesos por unidad (kg):
-- 1:2.0, 2:2.0, 3:3.0, 4:2.0, 5:2.0, 6:1.0, 7:1.0
-- Estado objetivo: lista_para_produccion; Observaciones: 'test'
-- OV vÃ¡lidas usadas: 102,103,104,117,119,105,106

-- Grupo 0
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 1, 'lista_para_produccion', 5, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 2, 'lista_para_produccion', 4, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 3, 'lista_para_produccion', 3, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 4, 'lista_para_produccion', 6, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 5, 'lista_para_produccion', 5, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 6, 'lista_para_produccion', 10, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 0), 7, 'lista_para_produccion', 8, 'test');

-- Grupo 1
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 2, 'lista_para_produccion', 6, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 3, 'lista_para_produccion', 5, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 4, 'lista_para_produccion', 8, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 5, 'lista_para_produccion', 7, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 6, 'lista_para_produccion', 13, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 7, 'lista_para_produccion', 10, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 1), 1, 'lista_para_produccion', 6, 'test');

-- Grupo 2
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 3, 'lista_para_produccion', 7, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 4, 'lista_para_produccion', 10, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 5, 'lista_para_produccion', 9, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 6, 'lista_para_produccion', 16, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 7, 'lista_para_produccion', 12, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 1, 'lista_para_produccion', 7, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 2), 2, 'lista_para_produccion', 6, 'test');

-- Grupo 3
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 4, 'lista_para_produccion', 12, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 5, 'lista_para_produccion', 11, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 6, 'lista_para_produccion', 19, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 7, 'lista_para_produccion', 14, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 1, 'lista_para_produccion', 8, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 2, 'lista_para_produccion', 7, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 3), 3, 'lista_para_produccion', 6, 'test');

-- Grupo 4
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 5, 'lista_para_produccion', 13, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 6, 'lista_para_produccion', 22, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 7, 'lista_para_produccion', 16, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 1, 'lista_para_produccion', 9, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 2, 'lista_para_produccion', 8, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 3, 'lista_para_produccion', 7, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 4), 4, 'lista_para_produccion', 14, 'test');

-- Grupo 5
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 6, 'lista_para_produccion', 25, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 7, 'lista_para_produccion', 18, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 1, 'lista_para_produccion', 10, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 2, 'lista_para_produccion', 9, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 3, 'lista_para_produccion', 8, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 4, 'lista_para_produccion', 16, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 5), 5, 'lista_para_produccion', 15, 'test');

-- Grupo 6
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 7, 'lista_para_produccion', 20, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 1, 'lista_para_produccion', 11, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 2, 'lista_para_produccion', 10, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 3, 'lista_para_produccion', 9, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 4, 'lista_para_produccion', 18, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 5, 'lista_para_produccion', 17, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 6), 6, 'lista_para_produccion', 28, 'test');

-- Grupo 7
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 1, 'lista_para_produccion', 12, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 2, 'lista_para_produccion', 11, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 3, 'lista_para_produccion', 10, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 4, 'lista_para_produccion', 20, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 5, 'lista_para_produccion', 19, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 6, 'lista_para_produccion', 31, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 7), 7, 'lista_para_produccion', 22, 'test');

-- Grupo 8
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 2, 'lista_para_produccion', 12, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 3, 'lista_para_produccion', 11, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 4, 'lista_para_produccion', 22, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 5, 'lista_para_produccion', 21, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 6, 'lista_para_produccion', 34, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 7, 'lista_para_produccion', 24, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 8), 1, 'lista_para_produccion', 13, 'test');

-- Grupo 9
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 3, 'lista_para_produccion', 14, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 4, 'lista_para_produccion', 24, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 5, 'lista_para_produccion', 23, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 6, 'lista_para_produccion', 37, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 7, 'lista_para_produccion', 26, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 1, 'lista_para_produccion', 14, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 9), 2, 'lista_para_produccion', 13, 'test');

-- Grupo 10
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 4, 'lista_para_produccion', 26, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 5, 'lista_para_produccion', 25, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 6, 'lista_para_produccion', 40, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 7, 'lista_para_produccion', 28, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 1, 'lista_para_produccion', 15, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 2, 'lista_para_produccion', 14, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 10), 3, 'lista_para_produccion', 13, 'test');

-- Grupo 11
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 5, 'lista_para_produccion', 27, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 6, 'lista_para_produccion', 43, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 7, 'lista_para_produccion', 30, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 1, 'lista_para_produccion', 16, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 2, 'lista_para_produccion', 15, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 3, 'lista_para_produccion', 14, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 11), 4, 'lista_para_produccion', 28, 'test');

-- Grupo 12
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 6, 'lista_para_produccion', 46, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 7, 'lista_para_produccion', 32, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 1, 'lista_para_produccion', 17, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 2, 'lista_para_produccion', 16, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 3, 'lista_para_produccion', 15, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 4, 'lista_para_produccion', 30, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 12), 5, 'lista_para_produccion', 29, 'test');

-- Grupo 13
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 7, 'lista_para_produccion', 34, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 1, 'lista_para_produccion', 18, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 2, 'lista_para_produccion', 17, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 3, 'lista_para_produccion', 16, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 4, 'lista_para_produccion', 32, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 5, 'lista_para_produccion', 31, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 13), 6, 'lista_para_produccion', 49, 'test');

-- Grupo 14
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 1, 'lista_para_produccion', 19, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 2, 'lista_para_produccion', 18, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 3, 'lista_para_produccion', 17, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 4, 'lista_para_produccion', 34, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 5, 'lista_para_produccion', 33, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 6, 'lista_para_produccion', 52, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 14), 7, 'lista_para_produccion', 36, 'test');

-- Grupo 15
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 2, 'lista_para_produccion', 20, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 3, 'lista_para_produccion', 19, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 4, 'lista_para_produccion', 36, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 5, 'lista_para_produccion', 35, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 6, 'lista_para_produccion', 55, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 7, 'lista_para_produccion', 38, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 15), 1, 'lista_para_produccion', 20, 'test');

-- Grupo 16
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 3, 'lista_para_produccion', 21, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 4, 'lista_para_produccion', 38, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 5, 'lista_para_produccion', 37, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 6, 'lista_para_produccion', 58, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 7, 'lista_para_produccion', 40, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 1, 'lista_para_produccion', 21, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 16), 2, 'lista_para_produccion', 20, 'test');

-- Grupo 17
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 4, 'lista_para_produccion', 40, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 5, 'lista_para_produccion', 39, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 6, 'lista_para_produccion', 61, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 7, 'lista_para_produccion', 42, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 1, 'lista_para_produccion', 22, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 2, 'lista_para_produccion', 21, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 17), 3, 'lista_para_produccion', 20, 'test');

-- Grupo 18
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 5, 'lista_para_produccion', 41, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 6, 'lista_para_produccion', 64, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 7, 'lista_para_produccion', 44, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 1, 'lista_para_produccion', 23, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 2, 'lista_para_produccion', 22, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 3, 'lista_para_produccion', 21, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 18), 4, 'lista_para_produccion', 42, 'test');

-- Grupo 19
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 6, 'lista_para_produccion', 67, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 7, 'lista_para_produccion', 46, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 1, 'lista_para_produccion', 24, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 2, 'lista_para_produccion', 23, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 3, 'lista_para_produccion', 22, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 4, 'lista_para_produccion', 44, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 19), 5, 'lista_para_produccion', 43, 'test');

-- Grupo 20
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 7, 'lista_para_produccion', 48, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 1, 'lista_para_produccion', 25, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 2, 'lista_para_produccion', 24, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 3, 'lista_para_produccion', 23, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 4, 'lista_para_produccion', 46, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 5, 'lista_para_produccion', 45, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 20), 6, 'lista_para_produccion', 70, 'test');

-- Grupo 21
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 1, 'lista_para_produccion', 26, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 2, 'lista_para_produccion', 25, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 3, 'lista_para_produccion', 24, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 4, 'lista_para_produccion', 48, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 5, 'lista_para_produccion', 47, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 6, 'lista_para_produccion', 73, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 21), 7, 'lista_para_produccion', 50, 'test');

-- Grupo 22
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 2, 'lista_para_produccion', 27, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 3, 'lista_para_produccion', 26, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 4, 'lista_para_produccion', 50, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 5, 'lista_para_produccion', 49, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 6, 'lista_para_produccion', 76, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 7, 'lista_para_produccion', 52, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 22), 1, 'lista_para_produccion', 27, 'test');

-- Grupo 23
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 3, 'lista_para_produccion', 28, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 4, 'lista_para_produccion', 52, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 5, 'lista_para_produccion', 51, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 6, 'lista_para_produccion', 79, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 7, 'lista_para_produccion', 54, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 1, 'lista_para_produccion', 28, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 23), 2, 'lista_para_produccion', 27, 'test');

-- Grupo 24
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 4, 'lista_para_produccion', 54, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 5, 'lista_para_produccion', 53, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 6, 'lista_para_produccion', 82, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 7, 'lista_para_produccion', 56, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 1, 'lista_para_produccion', 29, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 2, 'lista_para_produccion', 28, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 24), 3, 'lista_para_produccion', 27, 'test');

-- Grupo 25
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 5, 'lista_para_produccion', 55, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 6, 'lista_para_produccion', 85, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 7, 'lista_para_produccion', 58, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 1, 'lista_para_produccion', 30, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 2, 'lista_para_produccion', 29, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 3, 'lista_para_produccion', 28, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 25), 4, 'lista_para_produccion', 56, 'test');

-- Grupo 26
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 6, 'lista_para_produccion', 88, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 7, 'lista_para_produccion', 60, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 1, 'lista_para_produccion', 31, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 2, 'lista_para_produccion', 30, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 3, 'lista_para_produccion', 29, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 4, 'lista_para_produccion', 58, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 26), 5, 'lista_para_produccion', 57, 'test');

-- Grupo 27
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 7, 'lista_para_produccion', 62, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 1, 'lista_para_produccion', 32, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 2, 'lista_para_produccion', 31, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 3, 'lista_para_produccion', 30, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 4, 'lista_para_produccion', 60, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 5, 'lista_para_produccion', 59, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 27), 6, 'lista_para_produccion', 91, 'test');

-- Grupo 28
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 1, 'lista_para_produccion', 33, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 2, 'lista_para_produccion', 32, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 3, 'lista_para_produccion', 31, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 4, 'lista_para_produccion', 62, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 5, 'lista_para_produccion', 61, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 6, 'lista_para_produccion', 94, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 28), 7, 'lista_para_produccion', 64, 'test');

-- Grupo 29
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 2, 'lista_para_produccion', 34, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 3, 'lista_para_produccion', 33, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 4, 'lista_para_produccion', 64, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 5, 'lista_para_produccion', 63, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 6, 'lista_para_produccion', 97, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 7, 'lista_para_produccion', 66, 'test');
INSERT INTO orden_produccion (id_orden_venta, id_producto, estado, cantidad, observaciones) VALUES ((current_setting(''my.ov_base'')::int + 29), 1, 'lista_para_produccion', 34, 'test');

COMMIT;

-- Limpieza sugerida:
-- DELETE FROM dev.orden_produccion WHERE observaciones = 'test';


