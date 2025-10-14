
export interface SolicitudVenta{
  id_orden_venta: number;
  id_cliente: number;
  nombre_contacto: string;
  apellido_contacto: string;
  razon_social: string;
  email: string;
  telefono: string;
  productos:{
  id: number;
  nombre: string;
  cantidad: number;}
  fecha_pedido: string; // ISO date string
  fecha_entrega: string; // ISO date string}
  valor_total_pedido: number;
}
