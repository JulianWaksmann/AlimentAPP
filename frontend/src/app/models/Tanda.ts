import { LineaDeProduccion } from "./LineaDeProduccion";
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

   