import { ApiData } from "../components/Mapa";
import { Flota } from "../models/Flota";
import { PedidoRetiro } from "../models/PedidosVentas";
import { PedidosAsignadosResponse } from "../pages/vendedor/inicio/pedidos-en-camino/page";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function CreateFlota(flota: Flota) {

    const response = await fetch(`${apiUrl}/gestion-vehiculos/post-registrar-vehiculo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(flota),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear la flota");
    }
    return response.json();

}

export async function GetFlotas(): Promise<Flota[]> {
    const response = await fetch(`${apiUrl}/gestion-vehiculos/get-vehiculos-disponibles`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error("Error fetching flotas");
    }
    const data = await response.json();
    return Array.isArray(data.vehiculos) ? data.vehiculos : [];
}

export async function crearEnvio(payload: { id_vehiculo: number|undefined; ids_pedidos: number[] }) {
    
    const bodyForAPI = {
        id_vehiculo: payload.id_vehiculo,
        ordenes_venta: payload.ids_pedidos.map(id => ({ id_orden_venta: id }))
    };

    const response = await fetch(`${apiUrl}/gestion-envios/post-crear-tanda-envios`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyForAPI),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el envio");
    }
    return response.json();

}


export async function getPedidosRetiro(): Promise<PedidoRetiro[]> {
    const response = await fetch(`${apiUrl}/get-orden-venta/get-orden-venta-lista`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error("Error fetching pedidos para retiro");
    }
    const data = await response.json();
    return Array.isArray(data.pedidos) ? data.pedidos : [];
}

export async function entregarPedido(idPedido: number) {
    const response = await fetch(`${apiUrl}/crear-orden-venta/update-estado-orden-venta`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_pedido: idPedido, estado: "entregada" }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al marcar el pedido como entregado");
    }
    return response.json();
}


export async function verPedidos(dni: string, estado: string): Promise<PedidosAsignadosResponse> {
    const data = {
        dni_conductor : dni,
        estado_envio: estado
    }
    // console.log(JSON.stringify(data));
    const response = await fetch(`${apiUrl}/gestion-envios/post-obtener-envios-por-estado-y-conductor`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error("Error fetching pedidos para retiro");
    }
    const responseData = await response.json();
   
    return responseData.vehiculo[0];
}

export async function verificarEntrega(dni: string, id_envio: number) {
    const data = {
        dni_cliente : dni,
        id_envio: id_envio
    }
    const response = await fetch(`${apiUrl}/gestion-envios/post-entregar-envio-por-dni`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        console.log("Error en la respuesta de verificarEntrega");
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al verificar la entrega");
    }
    return response.json();
}

export async function getRecorrido(dni: string): Promise<ApiData> {
    const data = {
        dni_conductor : dni
    }
    const response = await fetch(`${apiUrl}/gestion-envios/post-get-camino-optimo-por-conductor`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    }
)

    const responseData = await response.json();
    console.log("respuesta ordenes: " + responseData);
    return responseData;;
    
}