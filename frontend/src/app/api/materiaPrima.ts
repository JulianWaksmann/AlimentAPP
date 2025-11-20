
import { LotesMP } from "../models/MateriaPrima";
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

    // console.log(data);

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
    const response = await fetch(`${apiUrl}/gestion-materia-prima/pedido-materia-prima`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching pedidos materia prima");
  }
    const data = await response.json();

    return data.pedidos_materia_prima;

  // return response.json();

}

export async function updateEstadoPedidoMateriaPrima(
  id_lote: number,
   fecha_vencimiento: string,
  estado: string,
  observaciones: string,
  codigo_lote: string
)

{
  console.log(id_lote, fecha_vencimiento, estado, observaciones, codigo_lote);
  const response = await fetch(`${apiUrl}/gestion-materia-prima/update-actualizar-estado-lote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_lote: id_lote,
      fecha_vencimiento: fecha_vencimiento,
      nuevo_estado: estado,
      observaciones: observaciones,
      codigo_lote: codigo_lote,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al actualizar el estado del pedido");
  }
  return response.json();
}

export async function cancelarPedidoMateriaPrima(id_pedido: number) {
  const response = await fetch(`${apiUrl}/gestion-materia-prima/rechazar-pedido-materia-prima`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_pedido: id_pedido,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al cancelar el pedido");
  }
  return response.json();
} 


export async function getStockMateriaPrima() {
  const response = await fetch(`${apiUrl}/gestion-materia-prima/stock`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching stock materia prima");
  }
    const data = await response.json();

    // console.log(data.stock_materia_prima);

    return data.stock_materia_prima;

  // return response.json();

}


export async function aceptarMP() {
  const response = await fetch(`${apiUrl}/gestion-materia-prima/get-aceptar-materia-prima-automatico`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error accepting materia prima");
  }
    const data = await response.json();

    // console.log(data);

    return data;

  // return response.json();

}

export async function getLotes(): Promise<LotesMP[]>  {
  const response = await fetch(`${apiUrl}/gestion-materia-prima/get-all-lotes-materia-prima`, {
    method: "GET",
    headers: {
    "Content-Type": "application/json",
  },
});
  if (!response.ok) {
    throw new Error("Error fetching stock materia prima");
  }
    const data = await response.json();
    console.log(data);
    return data.materias_primas;


}

export async function obtenerPDF(id_lote: number): Promise<string> {
  const response = await fetch(`${apiUrl}/gestion-materia-prima/post-pdf-trazabilidad-lote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
    },
    body: JSON.stringify({ lote_id: id_lote }),
    });
  if (!response.ok) {
    throw new Error("Error fetching PDF");
  }
  // console.log("Respuesta del fetch PDF:", response);
    const base = await response.text();
    console.log("Blob del PDF:", base);
    return base;
}


