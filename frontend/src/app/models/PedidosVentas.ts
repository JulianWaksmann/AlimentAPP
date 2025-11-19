export interface PedidosVentas {
    idPedido: number;
    idCliente: number;
    idVendedor?: number;
    nombreCliente: string;
    apellidoCliente: string;
    productos:{ idProducto: number;nombre: string; cantidad: number}[];
    fechaPedido: string; // ISO date string
    fechaEntrega: string;
    fechaSolicitada: string;
    valorPedido: number;
    estado: string;//'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
    email?: string;
    telefono?: string;
}


export interface PedidosPorZona{
    zona: string;
    pedidos: PedidosVentas[];
}

// This is what the page will use after flattening the API response
export interface PedidosTerminados {
    id_pedido_venta: number; // from id_orden_venta
    id_cliente: number;
    razon_social: string;
    email: string;
    nombre_contacto: string;
    apellido_contacto: string;
    telefono: string;
    productos: {
        id: number;
        nombre: string;
        cantidad: number;
    }[];
    fecha_pedido: string;
    fecha_entrega: string;
    valor_total_pedido: number;
    peso_total_kg: number; // from peso_total_pedido
    direccion_entrega: string;
    // zona: string;
}

// This represents the actual structure from the /get-pedidos-por-zona endpoint
export interface PedidosPorZonaAPI {
    zona: string;
    ordenes_venta: OrdenVentaAPI[];
}

export interface OrdenVentaAPI {
    id_orden_venta: number;
    id_cliente: number;
    razon_social: string;
    email: string;
    nombre_contacto: string;
    apellido_contacto: string;
    telefono: string;
    productos: {
        id: number;
        nombre: string;
        cantidad: number;
    }[];
    fecha_pedido: string;
    fecha_entrega: string;
    valor_total_pedido: number;
    peso_total_pedido: number;
    direccion_entrega: string;
}


export interface PedidoRetiro {
    id_pedido_venta: number;
    id_cliente: number;
    razon_social: string;
    email: string;
    nombre_contacto: string;
    apellido_contacto: string;
    telefono: string;
    productos: {
        id_producto: number;
        nombre_producto: string;
        cantidad: number;
    }[];
    fecha_pedido: string;
    fecha_entrega_solicitada: string;
    valor_total_pedido: number;
    peso_total_kg: number;
}


export interface PedidoCliente {
    id_pedido_venta: number;
    estado_pedido: string;
    fecha_pedido: string;
    fecha_entrega_solicitada: string;
    valor_total_pedido: number;
    productos: {
        id_producto: number;
        nombre: string;
        cantidad: number;
    }[];
}