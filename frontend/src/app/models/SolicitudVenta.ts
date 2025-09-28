import { Producto } from "./Producto";

export interface SolicitudVenta {
  clienteId: number;
  productos: Producto[];
  cantidad: number;
  fechaSolicitud: string; // ISO date string
  estado: string// 'pendiente' | 'aprobada' | 'rechazada';
}