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

export async function updateCliente(cliente: Cliente) {
  console.log("Actualizar cliente: ", cliente);
  const response = await fetch(`${apiUrl}/update-client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cliente),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error updating cliente");
  }
  return response.json();
}