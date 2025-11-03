export interface Flota {
   id? : number;
   empresa: string;
   nombre_conductor: string;
   apellido_conductor: string;
   dni_conductor: string;
   tipo_unidad: 'camion' | 'camioneta' | 'auto';
   patente: string;
   modelo: string;
   capacidad_kg: number;
   color?: string;
   disponible?: boolean;
}


