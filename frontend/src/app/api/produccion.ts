import { OrdenProduccion, OrdenDetalle } from "../models/OrdenProduccion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetOrdenesProduccion(): Promise<OrdenProduccion[]> {
  const response = await fetch(`${apiUrl}/orden-produccion/orden-produccion-listaprd-enproceso-finalizada`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching productos");
  }
  const data = await response.json();
  // console.log(data.ordenes_produccion);
    return Array.isArray(data.ordenes_produccion) ? data.ordenes_produccion : [];
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

export async function getOrdenesDeProduccionEnEstado(estado: string): Promise<OrdenProduccion[]> {
  const estadoOP = {
    estado_orden_produccion: estado,
  };
  console.log("fetch ordenes de produccion en estado: " + estado);
  const response = await fetch(`${apiUrl}/orden-produccion/listar-orden-produccion-por-estado`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(estadoOP),

  });
  if (!response.ok) {
    throw new Error("Error fetching productos");
  }
  const data = await response.json();
  // console.log(data);
  return data.ordenes_produccion;
}
export async function getOrdenProduccionDetails(id: number): Promise<OrdenDetalle> {
  const data= {
    id_orden_produccion: id,
  }
  const response = await fetch(`${apiUrl}/orden-produccion/post-get-orden-produccion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
          body: JSON.stringify(data),

  });
  if (!response.ok) {
    throw new Error("Error fetching orden de produccion details");
  }
  const res = await response.json();
  console.log("Detalles de la orden de produccion:", data);
  return res.orden_produccion;
}
// export async function CreateOrdenProduccion(ordenData: {