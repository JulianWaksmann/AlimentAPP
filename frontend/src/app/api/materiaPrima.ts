
import { MateriaPrimaXProovedor } from "../models/MateriaPrimaXProovedor";
import { PedidoMateriaPrima } from "../models/PedidoMateriaPrima";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;


export async function getMateriaPrimaXProovedor(): Promise<MateriaPrimaXProovedor[]>  {
    const response = await fetch(`${apiUrl}/gestion-materia-prima/all-proveedores-por-materia-prima`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching materia prima x proovedor");
  }
    const data = await response.json();

    console.log(data);

    return data.materias_primas;

  // return response.json();

}

export async function GenerarPedidoMateriaPrima({ idMateriaPrima, idProveedor, cantidad }: {
  idMateriaPrima: number;
  idProveedor: number;
  cantidad: number;
}) {
  const response = await fetch(`${apiUrl}/gestion-materia-prima/generar-compra-materia-prima`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_materia_prima: idMateriaPrima,
      id_proveedor: idProveedor,
      cantidad_total: cantidad,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al pedir materia prima");
  }
  return response.json();
}

export async function getAllPedidosMateriaPrima(): Promise<PedidoMateriaPrima[]>  {
    const response = await fetch(`${apiUrl}/all-pedidos-materia-prima`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching pedidos materia prima");
  }
    const data = await response.json();

    return data.PedidosMateriaPrima;

  // return response.json();

}
