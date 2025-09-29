import { OrdenProduccion } from "../models/OrdenProduccion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;


export async function GetOrdenesProduccion(): Promise<OrdenProduccion[]> {
    const response = await fetch(`${apiUrl}/orden-produccion`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
    );
    if (!response.ok) {
      throw new Error("Error fetching productos");
    }
     const data = await response.json();
     console.log(data);
  return data.ordenes_produccion;
  }

    export async function UpdateEstadoOrdenProduccion(id: number, nuevoEstado: string): Promise<void> {
        const response = await fetch(`${apiUrl}/orden-produccion/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado_orden_produccion: nuevoEstado }),
        });
        if (!response.ok) {
          throw new Error("Error updating orden de produccion");
        }
      }