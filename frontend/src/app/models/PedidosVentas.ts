export interface PedidosVentas {
    idPedido: number;
    idCliente: number;
    idVendedor: number;
    productos:{ idProducto: number;nombre: string; cantidad: number}[];
    fechaPedido: string; // ISO date string
    fechaEntrega: string;
    estado: string;//'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
}
