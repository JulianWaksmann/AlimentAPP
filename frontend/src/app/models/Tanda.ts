import { OrdenProduccion } from "./OrdenProduccion";

export interface Tanda {
    linea_produccion_id: number;
    ordenes_produccion: OrdenProduccion[];
}

   