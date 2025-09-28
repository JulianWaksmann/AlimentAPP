import { Producto } from "../models/Producto";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetNombreProductos(): Promise<Producto[]> {
  const response = await fetch(`${apiUrl}/productos`,
    {
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
  return data.productos;
}