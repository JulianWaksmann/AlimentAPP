export interface MateriaPrima{
    id_materia_prima: number;
    nombre_materia_prima: string;
    expira?: boolean;
    codigo_lote?: string;
    unidad_medida?: string;
    cantidad_disponible?: number; 
}

export type Lote = {
    id_lote: number,
    codigo_lote: string,
    fecha_ingreso: string,
    fecha_vencimiento: string,
    cantidad_total: number,
    estado: string,
    nombre_proveedor: string
}
export type LotesMP = {
    id_materia_prima: number,
    nombre_materia_prima: string,
    unidad_medida: string,
    lotes: Lote[]
}