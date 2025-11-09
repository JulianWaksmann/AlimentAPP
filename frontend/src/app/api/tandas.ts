import { planificacion, Tanda, TandaProduccionManual } from "@/app/models/Tanda";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetTandas(estado: string): Promise<Tanda[]> {
const data = { estado: estado };
  const response = await fetch(`${apiUrl}/tanda-produccion/post-obtener-tanda-produccion-por-estado`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Error fetching tandas sugeridas");
  }
    const responseData = await response.json();
    console.log(responseData)
    return responseData.lineas_produccion;

    //ejemplo de lo que devuelve el endpoint:
//     {
//   "lineas_produccion": [
//     {
//       "id_linea_produccion": 4,
//       "nombre_linea_produccion": "Linea Carne",
//       "capacidad_linea_produccion": "60.00",
//       "descripcion_linea_produccion": "Cortadora de carne",
//       "activa_linea_produccion": true,
//       "tandas_de_produccion": [
//         {
//           "id_cliente": 12,
//           "id_producto": 2,
//           "id_orden_venta": 246,
//           "nombre_cliente": "Valentino",
//           "nombre_producto": "Hamburguesas Premium x4",
//           "apellido_cliente": "Maidana",
//           "cantidad_kg_tanda": 40.0,
//           "cantidad_producto": 20,
//           "secuencia_en_linea": 13,
//           "id_orden_produccion": 842,
//           "id_tanda_produccion": 25679,
//           "tiempo_estimado_min": null,
//           "fecha_fin_planificada": null,
//           "estado_tanda_produccion": "planificada",
//           "fecha_inicio_planificada": null,
//           "fecha_creacion_orden_venta": "2025-11-08",
//           "fecha_fin_orden_produccion": null,
//           "materias_primas_requeridas": [
//             {
//               "codigo_lote": "LT-098QW2",
//               "id_materia_prima": 17,
//               "nombre_materia_prima": "Bandejas de telgopor",
//               "id_lote_materia_prima": 715,
//               "cantidad_materia_prima": 8.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-24367",
//               "id_materia_prima": 7,
//               "nombre_materia_prima": "Pan rallado",
//               "id_lote_materia_prima": 718,
//               "cantidad_materia_prima": 2.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-71HQKE",
//               "id_materia_prima": 3,
//               "nombre_materia_prima": "Huevos frescos",
//               "id_lote_materia_prima": 748,
//               "cantidad_materia_prima": 50.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-HWOAW",
//               "id_materia_prima": 16,
//               "nombre_materia_prima": "Film plástico para congelados",
//               "id_lote_materia_prima": 751,
//               "cantidad_materia_prima": 12.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-68UR54",
//               "id_materia_prima": 12,
//               "nombre_materia_prima": "Condimentos varios",
//               "id_lote_materia_prima": 756,
//               "cantidad_materia_prima": 1.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-TUF678",
//               "id_materia_prima": 7,
//               "nombre_materia_prima": "Pan rallado",
//               "id_lote_materia_prima": 761,
//               "cantidad_materia_prima": 4.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-TJ79970",
//               "id_materia_prima": 3,
//               "nombre_materia_prima": "Huevos frescos",
//               "id_lote_materia_prima": 764,
//               "cantidad_materia_prima": 30.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-TK775H",
//               "id_materia_prima": 12,
//               "nombre_materia_prima": "Condimentos varios",
//               "id_lote_materia_prima": 765,
//               "cantidad_materia_prima": 6.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-14869",
//               "id_materia_prima": 17,
//               "nombre_materia_prima": "Bandejas de telgopor",
//               "id_lote_materia_prima": 766,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-T68KD46",
//               "id_materia_prima": 16,
//               "nombre_materia_prima": "Film plástico para congelados",
//               "id_lote_materia_prima": 767,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-YJFR57",
//               "id_materia_prima": 21,
//               "nombre_materia_prima": "Etiquetas adhesivas",
//               "id_lote_materia_prima": 777,
//               "cantidad_materia_prima": 80.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-32684",
//               "id_materia_prima": 12,
//               "nombre_materia_prima": "Condimentos varios",
//               "id_lote_materia_prima": 781,
//               "cantidad_materia_prima": 10.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-344TGG",
//               "id_materia_prima": 16,
//               "nombre_materia_prima": "Film plástico para congelados",
//               "id_lote_materia_prima": 783,
//               "cantidad_materia_prima": 30.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-111222333",
//               "id_materia_prima": 1,
//               "nombre_materia_prima": "Carne picada especial",
//               "id_lote_materia_prima": 792,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-00998877",
//               "id_materia_prima": 12,
//               "nombre_materia_prima": "Condimentos varios",
//               "id_lote_materia_prima": 793,
//               "cantidad_materia_prima": 23.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LOT-rfegd",
//               "id_materia_prima": 16,
//               "nombre_materia_prima": "Film plástico para congelados",
//               "id_lote_materia_prima": 800,
//               "cantidad_materia_prima": 18.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LOT-3r2e",
//               "id_materia_prima": 17,
//               "nombre_materia_prima": "Bandejas de telgopor",
//               "id_lote_materia_prima": 809,
//               "cantidad_materia_prima": 52.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-12486",
//               "id_materia_prima": 7,
//               "nombre_materia_prima": "Pan rallado",
//               "id_lote_materia_prima": 810,
//               "cantidad_materia_prima": 14.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-23690",
//               "id_materia_prima": 11,
//               "nombre_materia_prima": "Sal fina",
//               "id_lote_materia_prima": 811,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             }
//           ],
//           "fecha_entrega_real_orden_venta": null,
//           "fecha_creacion_orden_produccion": "2025-11-08",
//           "fecha_entrega_solicitada_orden_venta": "2025-11-10"
//         }
//       ]
//     },
//     {
//       "id_linea_produccion": 5,
//       "nombre_linea_produccion": "Linea Mezcla",
//       "capacidad_linea_produccion": "50.00",
//       "descripcion_linea_produccion": "Mezcladora de productos",
//       "activa_linea_produccion": true,
//       "tandas_de_produccion": [
//         {
//           "id_cliente": 18,
//           "id_producto": 2,
//           "id_orden_venta": 247,
//           "nombre_cliente": "Franco",
//           "nombre_producto": "Hamburguesas Premium x4",
//           "apellido_cliente": "Silva",
//           "cantidad_kg_tanda": 20.0,
//           "cantidad_producto": 10,
//           "secuencia_en_linea": 13,
//           "id_orden_produccion": 843,
//           "id_tanda_produccion": 25680,
//           "tiempo_estimado_min": null,
//           "fecha_fin_planificada": null,
//           "estado_tanda_produccion": "planificada",
//           "fecha_inicio_planificada": null,
//           "fecha_creacion_orden_venta": "2025-11-09",
//           "fecha_fin_orden_produccion": null,
//           "materias_primas_requeridas": [
//             {
//               "codigo_lote": "LT-995555",
//               "id_materia_prima": 21,
//               "nombre_materia_prima": "Etiquetas adhesivas",
//               "id_lote_materia_prima": 784,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-111222333",
//               "id_materia_prima": 1,
//               "nombre_materia_prima": "Carne picada especial",
//               "id_lote_materia_prima": 792,
//               "cantidad_materia_prima": 10.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LOT-yhtg",
//               "id_materia_prima": 12,
//               "nombre_materia_prima": "Condimentos varios",
//               "id_lote_materia_prima": 795,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LOT-rfegd",
//               "id_materia_prima": 16,
//               "nombre_materia_prima": "Film plástico para congelados",
//               "id_lote_materia_prima": 800,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LOT-17451",
//               "id_materia_prima": 3,
//               "nombre_materia_prima": "Huevos frescos",
//               "id_lote_materia_prima": 805,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LOT-3r2e",
//               "id_materia_prima": 17,
//               "nombre_materia_prima": "Bandejas de telgopor",
//               "id_lote_materia_prima": 809,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-12486",
//               "id_materia_prima": 7,
//               "nombre_materia_prima": "Pan rallado",
//               "id_lote_materia_prima": 810,
//               "cantidad_materia_prima": 10.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-23690",
//               "id_materia_prima": 11,
//               "nombre_materia_prima": "Sal fina",
//               "id_lote_materia_prima": 811,
//               "cantidad_materia_prima": 10.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             }
//           ],
//           "fecha_entrega_real_orden_venta": null,
//           "fecha_creacion_orden_produccion": "2025-11-09",
//           "fecha_entrega_solicitada_orden_venta": "2025-11-24"
//         },
//         {
//           "id_cliente": 1,
//           "id_producto": 2,
//           "id_orden_venta": 115,
//           "nombre_cliente": "Lucas Ezequiel",
//           "nombre_producto": "Hamburguesas Premium x4",
//           "apellido_cliente": "Mendez",
//           "cantidad_kg_tanda": 40.0,
//           "cantidad_producto": 20,
//           "secuencia_en_linea": 14,
//           "id_orden_produccion": 212,
//           "id_tanda_produccion": 25681,
//           "tiempo_estimado_min": null,
//           "fecha_fin_planificada": null,
//           "estado_tanda_produccion": "planificada",
//           "fecha_inicio_planificada": null,
//           "fecha_creacion_orden_venta": "2025-10-28",
//           "fecha_fin_orden_produccion": null,
//           "materias_primas_requeridas": [
//             {
//               "codigo_lote": "LT-71HQKE",
//               "id_materia_prima": 3,
//               "nombre_materia_prima": "Huevos frescos",
//               "id_lote_materia_prima": 748,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-KFIAB73",
//               "id_materia_prima": 3,
//               "nombre_materia_prima": "Huevos frescos",
//               "id_lote_materia_prima": 772,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-YJFR57",
//               "id_materia_prima": 21,
//               "nombre_materia_prima": "Etiquetas adhesivas",
//               "id_lote_materia_prima": 777,
//               "cantidad_materia_prima": 80.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-111222333",
//               "id_materia_prima": 1,
//               "nombre_materia_prima": "Carne picada especial",
//               "id_lote_materia_prima": 792,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-00998877",
//               "id_materia_prima": 12,
//               "nombre_materia_prima": "Condimentos varios",
//               "id_lote_materia_prima": 793,
//               "cantidad_materia_prima": 40.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LOT-rfegd",
//               "id_materia_prima": 16,
//               "nombre_materia_prima": "Film plástico para congelados",
//               "id_lote_materia_prima": 800,
//               "cantidad_materia_prima": 80.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LOT-3r2e",
//               "id_materia_prima": 17,
//               "nombre_materia_prima": "Bandejas de telgopor",
//               "id_lote_materia_prima": 809,
//               "cantidad_materia_prima": 80.0,
//               "unidad_medida_materia_prima": "unidad"
//             },
//             {
//               "codigo_lote": "LT-12486",
//               "id_materia_prima": 7,
//               "nombre_materia_prima": "Pan rallado",
//               "id_lote_materia_prima": 810,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             },
//             {
//               "codigo_lote": "LT-23690",
//               "id_materia_prima": 11,
//               "nombre_materia_prima": "Sal fina",
//               "id_lote_materia_prima": 811,
//               "cantidad_materia_prima": 20.0,
//               "unidad_medida_materia_prima": "kilogramos"
//             }
//           ],
//           "fecha_entrega_real_orden_venta": null,
//           "fecha_creacion_orden_produccion": "2025-10-28",
//           "fecha_entrega_solicitada_orden_venta": "2025-12-02"
//         }
//       ]
//     }
//   ]
// }
}

export async function UpdateEstadoTandaProduccion(  id_tandas: number[],  estado: string) {
  const data = {
      id_tandas: id_tandas,
      estado: estado,
    };
    console.log(data);
    console.log("actualizar ot "+ id_tandas + " a estado: " + estado);
    const response = await fetch(
      `${apiUrl}/tanda-produccion/post-update-tandas-produccion-estado`,
      {method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
      );
      if (!response.ok) {
        throw new Error("Error updating tanda produccion");
      }
}

export async function GetGenerarTanda(): Promise<TandaProduccionManual[]> {
  const response = await fetch(`${apiUrl}/tanda-produccion/get-all-ordenes-produccion-aceptadas-por-linea-produccion`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error generating tanda");
  }
    const data = await response.json();
    console.log(data);
    return data.lineas_produccion;
}

type ordenTandaNueva = {
  id_linea_produccion: number;
  ordenes_produccion: {
    id_orden_produccion: number;
    cantidad_kg: number;
  }[];
}
export async function CrearTandaProduccionManual(tandaData: ordenTandaNueva) {
  const data = {
    id_linea_produccion: tandaData.id_linea_produccion,
    ordenes_produccion: tandaData.ordenes_produccion,
  };
  console.log("Crear Tanda Produccion Manual: ", JSON.stringify(data));
  // console.log("Crear Tanda Produccion Manual: ", data);
  const response = await fetch(`${apiUrl}/tanda-produccion/post-crear-tandas-produccion-manual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tandaData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.log("Error creating tanda produccion manual:", errorData);
    throw new Error(errorData.error || "Error creating tanda produccion manual");
  }
  return response.json();
}


export async function getPlanificacionData(): Promise<planificacion[]> {
  try{
  const response = await fetch(`${apiUrl}/orden-produccion/planificador_op_daily`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    });
  if (!response.ok) {
    const errorData = await response.json();
    // console.log("Error fetching planificacion data:", errorData);
    throw new Error(errorData.error || "Error fetching planificacion data");
  }
  const data = await response.json();
  // console.log(data);
  return data;
}
catch (error) {
  console.log("error general: " + error);
  throw error;
}
}

