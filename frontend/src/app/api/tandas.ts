import { Tanda } from "@/app/models/Tanda";
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
    console.log(responseData);
    return responseData.lineas_produccion;
}

export async function UpdateEstadoTandaProduccion(  id_tandas: number[],  estado: string) {
    const data = {
      id_tandas: id_tandas,
      estado: estado,
    };
    console.log("actualizar ot "+ id_tandas + " a estado: " + estado);

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