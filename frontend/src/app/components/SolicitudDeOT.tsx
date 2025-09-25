import React, { useState } from "react";

type ProductoPedido = {
  idProducto: number;
  nombre: string;
  cantidad: number;
};

type PedidoVenta = {
  idPedido: number;
  productos: ProductoPedido[];
  fechaPedido: string;
  fechaEntrega: string;
};

type Props = {
  pedidos: PedidoVenta[];
  onAceptar: (pedido: PedidoVenta) => void;
};

const TablaPedidos: React.FC<Props> = ({ pedidos, onAceptar }) => {
  const [listaPedidos, setListaPedidos] = useState<PedidoVenta[]>(pedidos);

  const aceptarPedido = (pedido: PedidoVenta) => {
    onAceptar(pedido);
    setListaPedidos(listaPedidos.filter((p) => p.idPedido !== pedido.idPedido));
  };

  const rechazarPedido = (idPedido: number) => {
    setListaPedidos(listaPedidos.filter((p) => p.idPedido !== idPedido));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pedidos de Venta</h2>
      {listaPedidos.length === 0 ? (
        <p className="text-gray-600">No hay pedidos pendientes</p>
      ) : (
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">ID Pedido</th>
              <th className="border px-2 py-1">Productos</th>
              <th className="border px-2 py-1">Fecha Pedido</th>
              <th className="border px-2 py-1">Fecha Entrega</th>
              <th className="border px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listaPedidos.map((pedido) => (
              <tr key={pedido.idPedido}>
                <td className="border px-2 py-1">{pedido.idPedido}</td>
                <td className="border px-2 py-1">
                  <ul className="list-disc ml-4">
                    {pedido.productos.map((prod) => (
                      <li key={prod.idProducto}>
                        {prod.nombre} (x{prod.cantidad})
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="border px-2 py-1">
                  {new Date(pedido.fechaPedido).toLocaleString()}
                </td>
                <td className="border px-2 py-1">
                  {new Date(pedido.fechaEntrega).toLocaleDateString()}
                </td>
                <td className="border px-2 py-1 space-x-2 text-center">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    onClick={() => aceptarPedido(pedido)}
                  >
                    Aceptar
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    onClick={() => rechazarPedido(pedido.idPedido)}
                  >
                    Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TablaPedidos;
