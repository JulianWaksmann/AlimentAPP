import React from "react";
import { PedidosVentas } from "../models/PedidosVentas";
import { useMemo, useState, useEffect } from "react";
import { Cliente } from "app/models/Cliente";
import { GetNombreApellidoClientes } from "../api/clientes";

type Props = {
  pedidos: PedidosVentas[];
};

const estadoColor: Record<string, string> = {
  confirmada: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  cancelada: "bg-red-100 text-red-700",
  entregada: "bg-blue-100 text-blue-700",
  pendiente_supervision: "bg-orange-100 text-orange-700",
  despachado: "bg-purple-100 text-purple-700",
  asignada_para_envio: "bg-indigo-100 text-indigo-700",
  lista: "bg-teal-100 text-teal-700",
};

const sortOptions = [
  { value: "idPedido", label: "ID Pedido" },
  { value: "estado", label: "Estado" },
  { value: "fechaEntrega", label: "Fecha de Entrega" },
  { value: "fechaPedido", label: "Fecha de Pedido" },
  { value: "idCliente", label: "Cliente" },
];

export default function PedidoVenta({ pedidos }: Props) {
  const [nombreClientes, setNombreClientes] = useState<Cliente[]>([]);
  const [idCliente, setIdCliente] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");

  const [sortKey, setSortKey] = useState<string>("idPedido");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filtrar pedidos por cliente y estado
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const clienteMatch = idCliente ? String(p.idCliente) === idCliente : true;
      const estadoMatch = estadoFiltro ? p.estado === estadoFiltro : true;
      return clienteMatch && estadoMatch;
    });
  }, [pedidos, idCliente, estadoFiltro]);

  // Ordenar los pedidos filtrados
  const sortedPedidos = useMemo(() => {
    const clone = [...pedidosFiltrados];
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
  }, [pedidosFiltrados, sortKey, sortAsc]);
    useEffect(() => {
      const fetchClientes = async () => {
        const clientes= await GetNombreApellidoClientes();
        // console.log(clientes);
          setNombreClientes(clientes);
      };
      fetchClientes();
    }, []);

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
      <h2 className="text-xl font-bold mb-4 text-primary">Pedidos de Venta</h2>
      <div className="flex flex-col md:flex-row md:items-center gap-2">
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
            className=" px-2 py-1 rounded bg-neutral-light text-xs"
            onClick={() => setSortAsc(a => !a)}
            title="Invertir orden"
          >
            {sortAsc ?"Ascendente ↑" :"Descendente ↓"}
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
          <label htmlFor="filtrar" className="text-sm font-medium">Filtros:</label>
          <select id="cliente" value={idCliente} onChange={(e) => setIdCliente(e.target.value)} className="w-full rounded border px-3 py-2">
            <option value="">Todos los clientes</option>
            {nombreClientes.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.id + " - " + c.nombre_contacto + " " + c.apellido_contacto}</option>
            ))}
          </select>
          <select id="estado" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="w-full rounded border px-3 py-2">
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="pendiente_supervision">Pendiente de aprobación</option>
            <option value="lista">Pedidos Terminados</option>
            <option value="asignada_para_Envio">Pedidos Listos para envio</option>
            <option value="despachado">Pedidos Despachados</option>
            <option value="entregada">Entregada</option>
          </select>
        </div>
      </div>

      <div className=" mt-6 space-y-4">
        {sortedPedidos.map((pedido) => (
          <div key={pedido.idPedido} className="rounded-lg border p-3 shadow-sm bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary">Pedido #{pedido.idPedido}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor[pedido.estado] || "bg-gray-200 text-gray-700"}`}>
                {pedido.estado.charAt(0).toUpperCase() + pedido.estado.slice(1).replaceAll("_", " ")}
              </span>
            </div>
            <div className="mb-1 text-sm"><span className="font-semibold">Cliente {pedido.idCliente} :</span> {pedido.nombreCliente} {pedido.apellidoCliente}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Pedido:</span> {pedido.fechaPedido ? (new Date(pedido.fechaPedido).getTime() > 0 ? new Date(pedido.fechaPedido).toLocaleDateString() : "-") : "-"}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Solicitada:</span> {pedido.fechaSolicitada ? (new Date(pedido.fechaSolicitada).getTime() > 0 ? new Date(pedido.fechaSolicitada).toLocaleDateString() : "-") : "-"}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Entrega:</span> {pedido.fechaEntrega ? (new Date(pedido.fechaEntrega).getTime() > 0 ? new Date(pedido.fechaEntrega).toLocaleDateString() : "-") : "-"}</div>
            <div className="mb-1 text-sm font-semibold">Productos:</div>
            <ul className="list-disc pl-5 text-sm">
              {pedido.productos.map((prod) => (
                <li key={`${pedido.idPedido}-${prod.idProducto}`}>
                  {prod.nombre} <span className="text-xs text-gray-500">x{prod.cantidad}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-sm"><span className="font-semibold">Valor Total:</span> ${pedido.valorPedido}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
