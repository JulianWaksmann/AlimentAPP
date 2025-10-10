

export interface PedidoMateriaPrima{
    idPedidoMateriaPrima: number;
    idProovedor: number;
    fechaPedido: string; // ISO 8601 date string
    cantidad: number;
    total: number;
}