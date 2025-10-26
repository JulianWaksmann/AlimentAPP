export interface Finanza{
    fecha: string;
    ingresos?: number;
    costos?: number;
    ganancias?: number;
}

export interface EficienciaProduccion{
    fecha: string;
    producto: string;
    ordenes_finalizadas: number;
    cantidad_bultos: number;
}

export interface PedidosEntregados{
    fecha: string;
    entregados: number;
    tarde: number;
    a_tiempo: number;
}