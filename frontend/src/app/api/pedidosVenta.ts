import { PedidoCliente, PedidosTerminados, PedidosVentas } from "../models/PedidosVentas";
import { SolicitudVenta } from "../models/SolicitudVenta";
import { PedidosAsignadosResponse } from "../pages/logistica/inicio/pedidos-asignados/page";
import { PedidosVentasReprogramado } from "../pages/vendedor/inicio/pedidos-reprogramados/page";
import { OrdenProduccionConRetraso } from "../models/OrdenProduccion";
import { IdDireccion } from "../components/FormNuevoPedido";
// import { Direccion } from "../components/FormNuevoPedido";

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
  // direccion_nueva_opcional?: string;
  // zona?: string;
  prioritario?: boolean;}
//metodo post para crear un nuevo pedido de venta
//envio id cliente - id vendedor - fecha entrega - productos (array de id productos y cantidades de cada uno)
export async function CreateNuevoPedido(data: NuevoPedido){
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


export async function getPedidosTerminados(): Promise<PedidosTerminados[]> {
  const response = await fetch(`${apiUrl}/get-orden-venta/get-orden-venta-lista-con-envio`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching pedidos terminados");
  }
   const data = await response.json();
return data.pedidos;
}


export async function GetPedidosAsignados(estado : string): Promise<PedidosAsignadosResponse[]> {
  const data = {
    estado : estado
  };
  const response = await fetch(`${apiUrl}/gestion-envios/post-get-envios-por-estado`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  if (!response.ok) {
    throw new Error("Error fetching pedidos asignados");
  }
    const responseData = await response.json();
    console.log("Response Data:", responseData);
    return responseData.vehiculos;
}

export async function updateEstadoEnvio(id_vehiculo: number) {
  const data = {
    id_vehiculo: id_vehiculo,
  };
  const response = await fetch(`${apiUrl}/gestion-envios/post-update-despachar-all-envios-de-vehiculo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Error updating estado envio: ${response.status} - ${JSON.stringify(
        errorData,
      )}`,
    );
  }
  return response.json();
}

export async function entregarPedido(id_envio: number, estado: string) {
  const data = {
    id_envio: id_envio,
    estado: estado
  }
  console.log(JSON.stringify(data));
  const response = await fetch(`${apiUrl}/gestion-envios/post-update-estado-envio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Error updating estado envio: ${response.status} - ${JSON.stringify(
        errorData,
      )}`,
    );
  }
  return response.json();
}

















export async function getPedidosReprogramados(): Promise<PedidosVentasReprogramado[]> {
  const response = await fetch(`${apiUrl}/crear-orden-venta/get-orden-venta-atrasada`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    console.error("Failed to fetch pedidos reprogramados:", response.statusText);
    throw new Error("Error fetching pedidos reprogramados");
  }
  
   const data = await response.json();
  //  console.log("Pedidos Reprogramados Data:", data);
return data;
}


export async function getPedidosUrgentes(): Promise<SolicitudVenta[]> {
  const response = await fetch(`${apiUrl}/get-orden-venta/get-orden-venta-en-supervision-por-urgencia`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching pedidos urgentes");
  }
   const data = await response.json();
return data.orden_ventas_pendiente_supervision_urgencia;
}

export async function getOrdenesQueSeRetrasan(id_orden_venta: number): Promise<OrdenProduccionConRetraso[]> {
  const data = {
    id_orden_venta: id_orden_venta,
  };
  console.log(JSON.stringify( data ));
  const response = await fetch(`${apiUrl}/get-orden-venta/planificador_ordenes_produccion_simulacion_ov`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  if (!response.ok) {
    throw new Error("Error fetching ordenes que se retrasan");
  }
   const responseData = await response.json();
return responseData.ordenes_afectadas;
}

export async function getEstadoPedido(cuil: string, pedidoId: string): Promise<PedidoCliente> {
  const data = {
    id_orden_venta: pedidoId,
    cuil: cuil,
  };
  const response = await fetch(`${apiUrl}/get-orden-venta/get-detalle-pedido-por-id-y-cuil`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error ||"Error fetching estado del pedido");
  }
return responseData;
}


export async function crearDireccion(calle: string, numero: string, ciudad: string, provincia: string, id_cliente: number): Promise<IdDireccion> {
  const data = {
    id_cliente: id_cliente,
    calle: calle,
    numero: numero,
    localidad: ciudad,
    provincia: provincia
  };
  const response = await fetch(`${apiUrl}/crear-direccion/post-obtener-direcciones-normalizadas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify( data ),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Error creating direccion: ${response.status} - ${JSON.stringify(
        errorData,
      )}`,
    );
  }
   const responseData = await response.json();
   console.log("Respuesta de crearDireccion en API:", responseData);
return responseData;
}