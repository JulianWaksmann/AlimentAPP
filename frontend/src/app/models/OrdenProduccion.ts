export interface OrdenProduccion {
    id_orden_produccion: number;
    id_pedido: number;
    id_cliente: number;
    nombre_cliente: string;
    apellido_cliente: string;
    id_producto: number;
    nombre_producto: string;
    cantidad_producto: number;
    fecha_creacion_orden_venta: string;
    fechaentrega_orden_venta: string;
    estado_orden_produccion: string//"pendiente" | "en_proceso" | "finalizada" | "cancelada";
  }

    //       "id_pedido": 5,
    //   "id_cliente": 1,
    //   "nombre_cliente": "Ana",
    //   "apellido_cliente": "Gimenez",
    //   "id_producto": 2,
    //   "nombre_producto": "Hamburguesas Premium x4",
    //   "cantidad_producto": 1,
    //   "fecha_creacion_orden_venta": "2025-09-28",
    //   "fechaentrega_orden_venta": "2025-10-01",
    //   "estado_orden_produccion": "finalizada"