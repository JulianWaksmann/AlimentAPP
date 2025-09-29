import { OrdenProduccion } from "../models/OrdenProduccion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetOrdenesProduccion(): Promise<OrdenProduccion[]> {
  const response = await fetch(`${apiUrl}/orden-produccion`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching productos");
  }
  const data = await response.json();
  console.log(data);
  return data.ordenes_produccion;
}

export async function UpdateEstadoOrdenProduccion(  id: number,  nuevoEstado: string): Promise<void> {
  const data = {
    id_orden_produccion: id,
    estado: nuevoEstado,
  };
  console.log("actualizar ot "+ id + " a estado: " + nuevoEstado);
  const response = await fetch(
    `${apiUrl}/orden-produccion/update-orden-produccion`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    throw new Error("Error updating orden de produccion");
  }
}
