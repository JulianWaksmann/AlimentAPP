
export interface SolicitudVenta{
  id_orden_venta: number;
  productos:{
  id: number;
  nombre: string;
  cantidad: number;}
  fecha_pedido: string; // ISO date string
  fecha_entrega: string; // ISO date string}
}
