export interface MateriaPrima{
    id_materia_prima: number;
    nombre_materia_prima: string;
    expira?: boolean;
    codigo_lote?: string;
    unidad_medida?: string;
    cantidad_disponible?: number; 
}