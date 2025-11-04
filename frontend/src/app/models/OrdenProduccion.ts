export interface OrdenProduccion {
    id_orden_produccion: number;
    id_orden_venta: number;
    id_cliente: number;
    nombre_cliente: string;
    apellido_cliente: string;
    id_producto: number;
    nombre_producto: string;
    cantidad_producto: number;
    fecha_creacion_orden_venta: string;
    fecha_entrega_solicitada_orden_venta: string;
    fecha_entrega_real_orden_venta: string | "";
    fecha_creacion_orden_produccion: string;
    fecha_fin_orden_produccion: string | "";
    estado_orden_produccion: string//"pendiente" | "en_proceso" | "finalizada" | "cancelada";
    estado_tanda_produccion?: string;
    cantidad_kg?: number;
    cantidad_kg_orden_produccion?: number;
    secuencia_en_linea?: number;
    tiempo_estimado_min?: number;
    fecha_inicio_planificada?: string | "";
    fecha_fin_planificada?: string | "",
    cantidad_kg_tanda?: number;
    id_tanda_produccion: number;
    materias_primas_requeridas: {
        id_lote_materia_prima: number;
        codigo_lote: string;
        id_materia_prima: number;
        nombre_materia_prima: string;
        unidad_medida_materia_prima: string;
        cantidad_materia_prima: string;
    }[];
  }

export interface OrdenDetalle{
    id: number;
    id_orden_venta: number;
    id_producto: number;
    nombre_producto: string;
    fecha_creacion: string;
    fecha_fin: string | null;
    estado: string;
    cantidad: number;
    observaciones: string;
    cliente: string;
    valor_total_pedido: number;
    fecha_entrega_solicitada: string;
    materias_primas: {
        id: number;
        id_lote_materia_prima: number;
        cantidad_utilizada: number;
        nombre_materia_prima: string;
        unidad_medida: string;
        codigo_lote: string;
        fecha_ingreso: string;
    }[];
}


// {
//   "id": 221,
//   "id_orden_venta": 5,
//   "id_producto": 3,
//   "nombre_producto": "Empanadas de carne",
//   "fecha_creacion": "2025-10-29",
//   "fecha_fin": null,
//   "estado": "planificada",
//   "cantidad": 120,
//   "observaciones": "Lote en preparación",
//   "cliente": "Panadería San Martín",
//   "valor_total_pedido": 45000.
    // "materias_primas": [
    //   {
    //     "id": 7,
    //     "id_lote_materia_prima": 4,
    //     "cantidad_utilizada": 15.5,
    //     "nombre_materia_prima": "Carne vacuna",
    //     "unidad_medida": "kg",
    //     "codigo_lote": "LMP-2025-0004",
    //     "fecha_recepcion": "2025-10-20T00:00:00Z"
    //   }
    // ]
// }
