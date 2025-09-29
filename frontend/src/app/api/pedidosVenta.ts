
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function GetPedidosVenta(): Promise<[]> {
    const response = await fetch(`${apiUrl}/`);
    if (!response.ok) {
      throw new Error("Error fetching productos");
    }
    return response.json();
  }

//metodo post para crear un nuevo pedido de venta
//envio id cliente - id vendedor - fecha entrega - productos (array de id productos y cantidades de cada uno)
export async function CreateNuevoPedido(data: {
  id_cliente: number;
  id_vendedor: number;
  fecha_entrega_solicitada: string;
  productos: { id_producto: number; cantidad: number }[];
}){
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