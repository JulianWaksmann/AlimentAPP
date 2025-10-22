import { LineaDeProduccion } from "../models/LineaDeProduccion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetLineasProduccion(): Promise<LineaDeProduccion[]> {
  const response = await fetch(`${apiUrl}/gestion-linea-produccion/get-all-productos-aceptados-por-linea-produccion`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching lineas de produccion");
  }
  const data = await response.json();
  return Array.isArray(data.lineas_produccion) ? data.lineas_produccion : [];
}

export async function UpdateEstadoLineaProduccion(  id: number,  activa: boolean): Promise<void> { 
    const data = {
      id: id,
      nuevo_estado: activa,
    };
    console.log("actualizar ot "+ id + " a estado: " + activa);
    const response = await fetch(
        `${apiUrl}/gestion-linea-produccion/update-linea-produccion-activa`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error("Error updating linea de produccion");
      }
}

export async function updateLineaProduccion(linea: LineaDeProduccion) {
  const response = await fetch(`${apiUrl}/gestion-linea-produccion/update-datos-linea-produccion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: linea.id,
      nombre: linea.nombre,
      activa: linea.activa,
      descripcion: linea.descripcion,
      capacidad_maxima_kg: linea.capacidad_maxima_kg,
      ids_productos: linea.productos.map((producto) => producto.id),
    }),
  });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al actualizar la linea de produccion");
    }
    return response.json();
}

export async function createLineaProduccion(payload: { nombre: string; descripcion: string; productos: number[]; capacidad_maxima_kg?: number; activa?: boolean }) {
    const data = {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        capacidad_maxima_kg: payload.capacidad_maxima_kg,
        activa: payload.activa,
        ids_productos: payload.productos,
    }
  const response = await fetch(`${apiUrl}/gestion-linea-produccion/crear-linea-produccion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al crear la linea de produccion");
    }
    return response.json();
}