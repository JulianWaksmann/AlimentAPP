export interface SolicitudVenta {
  id: number;
  id_orden_venta: number;
  nombre: string;
  cantidad: number;
  fecha_pedido: string; // ISO date string
  fecha_entrega_solicitada: string; // ISO date string}
}