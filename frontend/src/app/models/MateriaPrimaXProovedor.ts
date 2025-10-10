import { Proovedor } from "./Proovedor";

export interface MateriaPrimaXProovedor{
    id_materia_prima: number;
    nombre_materia_prima: string;
    proveedores: Proovedor[];
}