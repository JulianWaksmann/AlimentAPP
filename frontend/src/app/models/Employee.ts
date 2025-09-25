export interface Employee {
  id?: number;        // ID único del empleado
  nombre: string;
  apellido: string;
  rol: string;//"Operario" | "Supervisor" | "Calidad" | "Jefe"; // Se pueden usar literales para mayor seguridad
  area: string; //"Producción" | "Envasado" | "Depósito" | "Calidad";
  turno: string ; //"Mañana" | "Tarde" | "Noche";
}
