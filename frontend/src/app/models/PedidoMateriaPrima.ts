

export interface PedidoMateriaPrima{
    id: number;
    id_materia_prima: number;
    nombre_materia_prima: string;
    cantidad_total: number;
    id_proveedor: number;
    razon_social_proveedor: string;
    telefono_proveedor: string;
    email_proveedor: string;
    fecha_generacion_pedido: string;
    expirable: boolean;
}
