import React from "react";
import { PedidosVentas } from "../models/PedidosVentas";
import { useMemo, useState } from "react";

type Props = {
  pedidos: PedidosVentas[];
};

const estadoColor: Record<string, string> = {
  confirmada: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  cancelada: "bg-red-100 text-red-700",
  entregada: "bg-blue-100 text-blue-700",
};

const sortOptions = [
  { value: "idPedido", label: "ID Pedido" },
  { value: "estado", label: "Estado" },
  { value: "fechaEntrega", label: "Fecha de Entrega" },
  { value: "fechaPedido", label: "Fecha de Pedido" },
  { value: "idCliente", label: "Cliente" },
];

export default function PedidoVenta({ pedidos }: Props) {
    const [sortKey, setSortKey] = useState<string>("fechaEntrega");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const sortedPedidos = useMemo(() => {
    const clone = [...pedidos];
    clone.sort((a, b) => {
      let valueA = a[sortKey as keyof PedidosVentas];
      let valueB = b[sortKey as keyof PedidosVentas];
      if (sortKey === "idPedido") {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }
      if (sortKey === "fechaEntrega" || sortKey === "fechaPedido") {
        valueA = new Date(valueA as string).getTime();
        valueB = new Date(valueB as string).getTime();
      }
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortAsc ? valueA - valueB : valueB - valueA;
      }
      return sortAsc
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
    return clone;
  }, [pedidos, sortKey, sortAsc]);

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
      <h2 className="text-xl font-bold mb-4 text-primary">Pedidos de Venta</h2>
              <div className="flex items-center gap-2">
          <label htmlFor="ordenar" className="text-sm font-medium">Ordenar por:</label>
          <select
            id="ordenar"
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            className="ml-2 px-2 py-1 rounded bg-neutral-light text-xs"
            onClick={() => setSortAsc(a => !a)}
            title="Invertir orden"
          >
            {sortAsc ? "Ascendente ↑" : "Descendente ↓"}
          </button>
        </div>

      <div className=" mt-6 space-y-4">
        {sortedPedidos.map((pedido) => (
          <div key={pedido.idPedido} className="rounded-lg border p-3 shadow-sm bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary">Pedido #{pedido.idPedido}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor[pedido.estado] || "bg-gray-200 text-gray-700"}`}>
                {pedido.estado.charAt(0).toUpperCase() + pedido.estado.slice(1)}
              </span>
            </div>
            <div className="mb-1 text-sm"><span className="font-semibold">Cliente:</span> {pedido.idCliente}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Pedido:</span> {new Date(pedido.fechaPedido).toLocaleDateString()}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Entrega:</span> {new Date(pedido.fechaEntrega).toLocaleDateString()}</div>
            <div className="mb-1 text-sm font-semibold">Productos:</div>
            <ul className="list-disc pl-5 text-sm">
              {pedido.productos.map((prod) => (
                <li key={`${pedido.idPedido}-${prod.idProducto}`}>
                  {prod.nombre} <span className="text-xs text-gray-500">x{prod.cantidad}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
