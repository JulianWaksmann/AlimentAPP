import { OrdenProduccion } from "./OrdenProduccion";

export interface Tanda {
    capacidad_maxima_kg_linea_produccion: number;
    descripcion_linea_produccion: string;
    id_linea_produccion: number;
    nombre_linea_produccion: string;
    activa_linea_produccion: boolean;
    // linea_produccion: LineaDeProduccion;
    tandas_de_produccion: OrdenProduccion[];
}

export interface TandaProduccionManual {
        id_linea_produccion: number,
        nombre_linea_produccion: string,
        capacidad_linea_produccion: number,
        descripcion_linea_produccion: string,
        activa_linea_produccion: boolean,
        ordenes_de_produccion_aceptadas: OrdenProduccion[],
}


   