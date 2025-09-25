import React, { useState } from "react";

export interface Producto {
  idProducto: number;
  nombre: string;
  cantidad: number;
}

export interface PedidoVenta {
  idPedido: number;
  idVendedor: number;
  idCliente: number;
  productos: Producto[];
  fechaPedido: string; // ISO string
  fechaEntrega: string; // ISO string
  estado: string //"SOLICITADO" | "ACEPTADO" | "EN PROCESO" | "CANCELADO" | "TERMINADO" | "ENVIADO";
}

interface PedidoVentaTableProps {
  pedidos: PedidoVenta[];
}

const estadoColors: Record<PedidoVenta["estado"], string> = {
  SOLICITADO: "bg-blue-500 text-white",
  ACEPTADO: "bg-green-600 text-white",
  "EN PROCESO": "bg-yellow-500 text-black",
  CANCELADO: "bg-red-600 text-white",
  TERMINADO: "bg-gray-600 text-white",
  ENVIADO: "bg-indigo-600 text-white",
};

const PedidoVentaTable: React.FC<PedidoVentaTableProps> = ({ pedidos }) => {
  const [sortKey, setSortKey] = useState<keyof PedidoVenta>("idPedido");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: keyof PedidoVenta) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedPedidos = [...pedidos].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortAsc ? aValue - bValue : bValue - aValue;
    }
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortAsc ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
    }
    return 0;
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead className="bg-primary text-white">
          <tr>
            <th
              className="px-6 py-3 cursor-pointer"
              onClick={() => toggleSort("idPedido")}
            >
              ID Pedido
            </th>
            <th
              className="px-6 py-3 cursor-pointer"
              onClick={() => toggleSort("idVendedor")}
            >
              ID Vendedor
            </th>
            <th
              className="px-6 py-3 cursor-pointer"
              onClick={() => toggleSort("idCliente")}
            >
              ID Cliente
            </th>
            <th className="px-6 py-3">Productos (Cantidad)</th>
            <th
              className="px-6 py-3 cursor-pointer"
              onClick={() => toggleSort("fechaPedido")}
            >
              Fecha Pedido
            </th>
            <th
              className="px-6 py-3 cursor-pointer"
              onClick={() => toggleSort("fechaEntrega")}
            >
              Fecha Entrega
            </th>
            <th
              className="px-6 py-3 cursor-pointer"
              onClick={() => toggleSort("estado")}
            >
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPedidos.map((pedido) => (
            <tr key={pedido.idPedido} className="odd:bg-neutral-light even:bg-white">
              <td className="px-6 py-3">{pedido.idPedido}</td>
              <td className="px-6 py-3">{pedido.idVendedor}</td>
              <td className="px-6 py-3">{pedido.idCliente}</td>
              <td className="px-6 py-3">
                {pedido.productos.map(p => (
                  <div key={p.idProducto}>
                    {p.nombre} ({p.cantidad})
                  </div>
                ))}
              </td>
              <td className="px-6 py-3">{new Date(pedido.fechaPedido).toLocaleDateString()}</td>
              <td className="px-6 py-3">{new Date(pedido.fechaEntrega).toLocaleDateString()}</td>
              <td className="px-6 py-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full font-semibold ${estadoColors[pedido.estado]}`}
                >
                  {pedido.estado}
                </span>
              </td>
            </tr>
          ))}
          {sortedPedidos.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-4 text-gray-500">
                No hay pedidos para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PedidoVentaTable;
