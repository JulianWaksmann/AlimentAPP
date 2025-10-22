import { Producto } from "./Producto";

export interface LineaDeProduccion{
    id?: number;
    nombre: string;
    descripcion: string;
    capacidad_maxima_kg:number;
    activa: boolean;
    productos: Producto[];
    ids_productos?: number[];
}