export interface Cliente {
  id?: number;
  nombre_contacto: string;
  apellido_contacto: string;
  telefono?: string;
  email: string;
  ciudad: string;
  direccion?: string;
  provincia: string;
  razon_social?: string;
  cuil?: string;
  activo?: boolean;
  created_at?: string;
}
