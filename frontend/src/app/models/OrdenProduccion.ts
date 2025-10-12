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
    fecha_entrega_real_orden_venta: string | null;
    fecha_creacion_orden_produccion: string;
    fecha_fin_orden_produccion: string | null;
    estado_orden_produccion: string//"pendiente" | "en_proceso" | "finalizada" | "cancelada";
    materias_primas_requeridas: {
        id_lote_materia_prima: number;
        codigo_lote: string;
        id_materia_prima: number;
        nombre_materia_prima: string;
        unidad_medida_materia_prima: string;
        cantidad_materia_prima: string;
    }[];
  }

//     "ordenes_produccion": [
//     {
//       "id_orden_produccion": 113,
//       "id_orden_venta": 56,
//       "id_cliente": 1,
//       "nombre_cliente": "Lucas Ezequiel",
//       "apellido_cliente": "Mendez",
//       "id_producto": 1,
//       "nombre_producto": "Empanadas de Carne x12",
//       "cantidad_producto": 16,
//       "fecha_creacion_orden_venta": "2025-09-28",
//       "fecha_entrega_solicitada_orden_venta": "2025-10-04",
//       "fecha_entrega_real_orden_venta": null,
//       "fecha_creacion_orden_produccion": "2025-09-28",
//       "fecha_fin_orden_produccion": null,
//       "estado_orden_produccion": "en_proceso",
//       "materias_primas_requeridas": [
//         {
//           "id_lote_materia_prima": 1,
//           "id_materia_prima": 1,
//           "nombre_materia_prima": "Carne picada especial",
//           "unidad_medida_materia_prima": "kilogramos",
//           "cantidad_materia_prima": "2.50"
//         },
//         {
//           "id_lote_materia_prima": 2,
//           "id_materia_prima": 2,
        // "codigo_lote": "LMP-001",

//           "nombre_materia_prima": "Condimentos varios",
//           "unidad_medida_materia_prima": "kilogramos",
//           "cantidad_materia_prima": "0.50"
//         }
//       ]
//     }
//   ]
// }