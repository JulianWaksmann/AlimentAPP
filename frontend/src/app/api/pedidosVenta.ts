import { PedidosVentas } from "../models/PedidosVentas";
import { SolicitudVenta } from "../models/SolicitudVenta";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetPedidosVenta(): Promise<PedidosVentas[]> {
    const response = await fetch(`${apiUrl}/crear-orden-venta`, {
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
  return data.data;
  }

  export type NuevoPedido = {
      id_cliente: number;
  id_vendedor: number;
  fecha_entrega_solicitada: string;
  productos: { id_producto: number; cantidad: number }[];
  comentario?: string;
  con_envio: boolean;
  id_direccion_entrega?: number;
  direccion_nueva_opcional?: string;
  zona?: string;}
//metodo post para crear un nuevo pedido de venta
//envio id cliente - id vendedor - fecha entrega - productos (array de id productos y cantidades de cada uno)
export async function CreateNuevoPedido(data: NuevoPedido
  // id_cliente: number;
  // id_vendedor: number;
  // fecha_entrega_solicitada: string;
  // productos: { id_producto: number; cantidad: number }[];
  // comentario?: string;
  // con_envio: boolean;
  // id_direccion_entrega?: number;
  // direccion_nueva_opcional?: string;
  // zona?: string;
  
){
  console.log("Creando nuevo pedido con data:", data);
  const response = await fetch(`${apiUrl}/crear-orden-venta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    
  });
  console.log(JSON.stringify(data));
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Error creating pedido: ${response.status} - ${JSON.stringify(
        errorData,
      )}`,
    );
  }
  return response.json();
}

export async function GetSolicitudVenta(): Promise<SolicitudVenta[]> {
  const response = await fetch(`${apiUrl}/get-orden-venta`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching solicitudes de venta");
  }
   const data = await response.json();
return data.orden_ventas_pendientes;
}

export async function updateEstadoSolicitudVenta(id: number, estado: "confirmada" | "cancelada") {
  const data = {
    id_pedido: id,
    estado: estado
  }
  // console.log(data);
  const response = await fetch(`${apiUrl}/crear-orden-venta/update-estado-orden-venta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Error updating estado: ${response.status} - ${JSON.stringify(
        errorData,
      )}`,
    );
  }
  return response.json();
}