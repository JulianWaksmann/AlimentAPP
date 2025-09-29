import { Cliente } from "../models/Cliente";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetNombreApellidoClientes(): Promise<Cliente[]> {
  const response = await fetch(`${apiUrl}/all-clients`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching productos");
  }
    const data = await response.json();

  // console.log(data.clients);
    return data.clients;

  // return response.json();
}