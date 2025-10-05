export interface PedidosVentas {
    idPedido: number;
    idCliente: number;
    idVendedor: number;
    nombreCliente: string;
    apellidoCliente: string;
    productos:{ idProducto: number;nombre: string; cantidad: number}[];
    fechaPedido: string; // ISO date string
    fechaEntrega: string;
    fechaSolicitada: string;
    valorPedido: number;
    estado: string;//'pendiente' | 'en_proceso' | 'completado' | 'cancelado';

}
