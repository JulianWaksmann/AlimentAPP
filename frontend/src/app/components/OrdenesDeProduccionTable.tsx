import React, { useMemo, useState } from "react";
import { OrdenProduccion } from "../models/OrdenProduccion";

type Props = {
  ordenes: OrdenProduccion[];
  onEstadoChange?: (id_orden_produccion: number, nuevoEstado: string) => void;
};

const estadoColor: Record<string, string> = {
  en_proceso: "bg-yellow-100 text-yellow-700",
  planificada: "bg-blue-100 text-blue-700",
  finalizada: "bg-green-100 text-green-700",
  pendiente: "bg-gray-100 text-gray-700",
};

const estados = [
  "en_proceso",
  "planificada",
  "finalizada",
  "pendiente",
];

const sortOptions = [
  { value: "id_orden_produccion", label: "ID Orden" },
  { value: "id_pedido", label: "ID Pedido" },
  { value: "id_cliente", label: "ID Cliente" },
  { value: "id_producto", label: "ID Producto" },
  { value: "fecha_creacion_orden_venta", label: "Fecha Creación" },
  { value: "fechaentrega_orden_venta", label: "Fecha Entrega" },
  { value: "estado_orden_produccion", label: "Estado" },
];

export default function OrdenesDeProduccionTable({ ordenes, onEstadoChange }: Props) {
  const [sortKey, setSortKey] = useState<string>("fecha_creacion_orden_venta");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<string>("");

  const sortedOrdenes = useMemo(() => {
    const clone = [...ordenes];
    clone.sort((a, b) => {
      let valueA = a[sortKey as keyof OrdenProduccion];
      let valueB = b[sortKey as keyof OrdenProduccion];
      if (
        sortKey === "id_orden_produccion" ||
        sortKey === "id_pedido" ||
        sortKey === "id_cliente" ||
        sortKey === "id_producto"
      ) {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }
      if (
        sortKey === "fecha_creacion_orden_venta" ||
        sortKey === "fechaentrega_orden_venta"
      ) {
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
  }, [ordenes, sortKey, sortAsc]);

  const handleEdit = (id: number, estadoActual: string) => {
    setEditId(id);
    setNuevoEstado(estadoActual);
  };

  const handleConfirm = (id: number) => {
    if (onEstadoChange) onEstadoChange(id, nuevoEstado);
    setEditId(null);
  };

  const handleCancel = () => {
    setEditId(null);
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold text-primary">Órdenes de Producción</h2>
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
      </div>
      {/* Tabla desktop */}
      <table className="min-w-full divide-y divide-gray-200 hidden md:table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">ID Orden</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">ID Pedido</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Cliente</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Producto</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Cantidad</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Fecha Creación</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Fecha Entrega</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Estado</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrdenes.map((orden) => (
            <tr key={orden.id_orden_produccion} className="hover:bg-gray-100 transition">
              <td className="px-2 py-2 text-sm">{orden.id_orden_produccion}</td>
              <td className="px-2 py-2 text-sm">{orden.id_pedido}</td>
              <td className="px-2 py-2 text-sm">{orden.nombre_cliente} {orden.apellido_cliente}</td>
              <td className="px-2 py-2 text-sm">{orden.nombre_producto}</td>
              <td className="px-2 py-2 text-sm">{orden.cantidad_producto}</td>
              <td className="px-2 py-2 text-sm">{orden.fecha_creacion_orden_venta}</td>
              <td className="px-2 py-2 text-sm">{orden.fechaentrega_orden_venta}</td>
              <td className="px-2 py-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor[orden.estado_orden_produccion] || "bg-gray-200 text-gray-700"}`}>
                  {orden.estado_orden_produccion.replace("_", " ")}
                </span>
              </td>
              <td className="px-2 py-2 text-sm">
                {editId === orden.id_orden_produccion ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={nuevoEstado}
                      onChange={e => setNuevoEstado(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {estados.map(e => (
                        <option key={e} value={e}>{e.replace("_", " ")}</option>
                      ))}
                    </select>
                    <button
                      className="px-2 py-1 bg-green-200 rounded text-xs"
                      onClick={() => handleConfirm(orden.id_orden_produccion)}
                    >
                      Aceptar
                    </button>
                    <button
                      className="px-2 py-1 bg-red-200 rounded text-xs"
                      onClick={handleCancel}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="px-2 py-1 bg-blue-200 rounded text-xs"
                    onClick={() => handleEdit(orden.id_orden_produccion, orden.estado_orden_produccion)}
                  >
                    Editar estado
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile: Cards */}
      <div className="md:hidden mt-6 space-y-4">
        {sortedOrdenes.map((orden) => (
          <div key={orden.id_orden_produccion} className="rounded-lg border p-3 shadow-sm bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary">Orden #{orden.id_orden_produccion}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor[orden.estado_orden_produccion] || "bg-gray-200 text-gray-700"}`}>
                {orden.estado_orden_produccion.replace("_", " ")}
              </span>
            </div>
            <div className="mb-1 text-sm"><span className="font-semibold">Pedido:</span> {orden.id_pedido}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Cliente:</span> {orden.nombre_cliente} {orden.apellido_cliente}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Producto:</span> {orden.nombre_producto}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Cantidad:</span> {orden.cantidad_producto}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Creación:</span> {orden.fecha_creacion_orden_venta}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Entrega:</span> {orden.fechaentrega_orden_venta}</div>
            <div className="mt-2">
              {editId === orden.id_orden_produccion ? (
                <div className="flex items-center gap-1">
                  <select
                    value={nuevoEstado}
                    onChange={e => setNuevoEstado(e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    {estados.map(e => (
                      <option key={e} value={e}>{e.replace("_", " ")}</option>
                    ))}
                  </select>
                  <button
                    className="px-2 py-1 bg-green-200 rounded text-xs"
                    onClick={() => handleConfirm(orden.id_orden_produccion)}
                  >
                    Aceptar
                  </button>
                  <button
                    className="px-2 py-1 bg-red-200 rounded text-xs"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  className="px-2 py-1 bg-blue-200 rounded text-xs"
                  onClick={() => handleEdit(orden.id_orden_produccion, orden.estado_orden_produccion)}
                >
                  Editar estado
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}