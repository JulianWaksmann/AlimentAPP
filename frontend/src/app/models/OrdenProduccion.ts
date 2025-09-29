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

  