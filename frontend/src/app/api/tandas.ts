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

