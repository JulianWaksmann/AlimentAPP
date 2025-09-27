import React, { useMemo, useState } from "react";

export type EstadoPedido =
  | "SOLICITADO"
  | "ACEPTADO"
  | "EN PROCESO"
  | "CANCELADO"
  | "TERMINADO"
  | "ENVIADO";

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
  fechaPedido: string;
  fechaEntrega: string;
  estado: EstadoPedido;
}

interface PedidoVentaTableProps {
  pedidos: PedidoVenta[];
}

const estadoColors: Record<EstadoPedido, string> = {
  SOLICITADO: "bg-blue-500 text-white",
  ACEPTADO: "bg-green-600 text-white",
  "EN PROCESO": "bg-yellow-500 text-black",
  CANCELADO: "bg-red-600 text-white",
  TERMINADO: "bg-gray-600 text-white",
  ENVIADO: "bg-indigo-600 text-white",
};

type SortKey = keyof PedidoVenta;

const PedidoVentaTable: React.FC<PedidoVentaTableProps> = ({ pedidos }) => {
  const [sortKey, setSortKey] = useState<SortKey>("idPedido");
  const [sortAsc, setSortAsc] = useState(true);

  const sortedPedidos = useMemo(() => {
    const clone = [...pedidos];
    clone.sort((a, b) => {
      const direction = sortAsc ? 1 : -1;
      const valueA = a[sortKey];
      const valueB = b[sortKey];

      if (sortKey === "fechaPedido" || sortKey === "fechaEntrega") {
        return (
          (new Date(valueA as string).getTime() - new Date(valueB as string).getTime()) * direction
        );
      }

      if (typeof valueA === "number" && typeof valueB === "number") {
        return (valueA - valueB) * direction;
      }

      return String(valueA).localeCompare(String(valueB)) * direction;
    });
    return clone;
  }, [pedidos, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((current) => !current);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const renderSortLabel = (key: SortKey, label: string) => {
    const isActive = sortKey === key;
    const indicator = isActive ? (sortAsc ? " ^" : " v") : "";
    return (
      <button
        type="button"
        className="flex items-center gap-1"
        onClick={() => toggleSort(key)}
      >
        <span>{label}</span>
        {indicator ? <span>{indicator}</span> : null}
      </button>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full rounded-lg bg-white shadow">
        <thead className="bg-primary text-white">
          <tr>
            <th className="px-6 py-3 text-left">{renderSortLabel("idPedido", "ID Pedido")}</th>
            <th className="px-6 py-3 text-left">{renderSortLabel("idVendedor", "ID Vendedor")}</th>
            <th className="px-6 py-3 text-left">{renderSortLabel("idCliente", "ID Cliente")}</th>
            <th className="px-6 py-3 text-left">Productos (cantidad)</th>
            <th className="px-6 py-3 text-left">{renderSortLabel("fechaPedido", "Fecha pedido")}</th>
            <th className="px-6 py-3 text-left">{renderSortLabel("fechaEntrega", "Fecha entrega")}</th>
            <th className="px-6 py-3 text-left">{renderSortLabel("estado", "Estado")}</th>
          </tr>
        </thead>
        <tbody>
          {sortedPedidos.map((pedido) => (
            <tr key={pedido.idPedido} className="odd:bg-neutral-light even:bg-white">
              <td className="px-6 py-3">{pedido.idPedido}</td>
              <td className="px-6 py-3">{pedido.idVendedor}</td>
              <td className="px-6 py-3">{pedido.idCliente}</td>
              <td className="px-6 py-3">
                {pedido.productos.map((producto) => (
                  <div key={producto.idProducto}>
                    {producto.nombre} ({producto.cantidad})
                  </div>
                ))}
              </td>
              <td className="px-6 py-3">
                {new Date(pedido.fechaPedido).toLocaleDateString()}
              </td>
              <td className="px-6 py-3">
                {new Date(pedido.fechaEntrega).toLocaleDateString()}
              </td>
              <td className="px-6 py-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 font-semibold ${estadoColors[pedido.estado]}`}
                >
                  {pedido.estado}
                </span>
              </td>
            </tr>
          ))}
          {sortedPedidos.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-center text-gray-500">
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

