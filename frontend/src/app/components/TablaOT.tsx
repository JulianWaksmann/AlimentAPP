"use client";
import React, { useState } from "react";

type OrdenTrabajo = {
  id: number;
  cliente: string;
  producto: string;
  cantidad: number;
  fechaEntrega: string;
  estado: string // "Pendiente" | "Asignada" | "En Proceso";
};

type LineaProduccion = {
  id: number;
  nombre: string;
  estado: string //"Disponible" | "Ocupada";
};

type MateriaPrima = {
  id: number;
  nombre: string;
  stock: number;
  requerido: number;
};

type Props = {
  ordenes: OrdenTrabajo[];
  lineas: LineaProduccion[];
  materiasPrimas: Record<number, MateriaPrima[]>;
};

const TablaOT: React.FC<Props> = ({ ordenes, lineas, materiasPrimas }) => {
  const [selectedOrden, setSelectedOrden] = useState<OrdenTrabajo | null>(null);
  const [selectedLinea, setSelectedLinea] = useState<number | null>(null);

  // 🔹 Estado para ordenamiento
  const [sortConfig, setSortConfig] = useState<{
    key: keyof OrdenTrabajo;
    direction: "asc" | "desc";
  } | null>(null);

  const handleAsignar = (orden: OrdenTrabajo) => {
    setSelectedOrden(orden);
    setSelectedLinea(null);
  };

  const confirmarAsignacion = () => {
    if (selectedOrden && selectedLinea !== null) {
      alert(
        `Orden ${selectedOrden.id} asignada a línea ${selectedLinea}. Queda en cola si la línea está ocupada.`
      );
      setSelectedOrden(null);
      setSelectedLinea(null);
    }
  };

  const verificarStock = (idOrden: number) => {
    return materiasPrimas[idOrden].every((mp) => mp.stock >= mp.requerido);
  };

  // 🔹 Función de ordenamiento
  const sortedOrdenes = [...ordenes].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let valA = a[key];
    let valB = b[key];

    // Si es fecha, convertir a Date
    if (key === "fechaEntrega") {
      valA = new Date(valA as string).getTime();
      valB = new Date(valB as string).getTime();
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const requestSort = (key: keyof OrdenTrabajo) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key: keyof OrdenTrabajo) => {
    if (!sortConfig || sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Órdenes de Trabajo</h2>
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th
              className="border px-2 py-1 cursor-pointer"
              onClick={() => requestSort("id")}
            >
              ID {renderSortArrow("id")}
            </th>
            <th
              className="border px-2 py-1 cursor-pointer"
              onClick={() => requestSort("cliente")}
            >
              Cliente {renderSortArrow("cliente")}
            </th>
            <th
              className="border px-2 py-1 cursor-pointer"
              onClick={() => requestSort("producto")}
            >
              Producto {renderSortArrow("producto")}
            </th>
            <th className="border px-2 py-1">Cantidad</th>
            <th
              className="border px-2 py-1 cursor-pointer"
              onClick={() => requestSort("fechaEntrega")}
            >
              Entrega {renderSortArrow("fechaEntrega")}
            </th>
            <th
              className="border px-2 py-1 cursor-pointer"
              onClick={() => requestSort("estado")}
            >
              Estado {renderSortArrow("estado")}
            </th>
            <th className="border px-2 py-1">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrdenes.map((orden) => (
            <tr key={orden.id}>
              <td className="border px-2 py-1">{orden.id}</td>
              <td className="border px-2 py-1">{orden.cliente}</td>
              <td className="border px-2 py-1">{orden.producto}</td>
              <td className="border px-2 py-1">{orden.cantidad}</td>
              <td className="border px-2 py-1">{orden.fechaEntrega}</td>
              <td className="border px-2 py-1">{orden.estado}</td>
              <td className="border px-2 py-1">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  onClick={() => handleAsignar(orden)}
                >
                  Asignar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {selectedOrden && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">
              Asignar Orden #{selectedOrden.id}
            </h3>

            {/* Selección de línea */}
            <label className="block font-semibold mb-2">
              Línea de Producción:
            </label>
            <select
              className="w-full border rounded px-2 py-1 mb-4"
              value={selectedLinea ?? ""}
              onChange={(e) => setSelectedLinea(Number(e.target.value))}
            >
              <option value="">-- Seleccionar línea --</option>
              {lineas.map((linea) => (
                <option key={linea.id} value={linea.id}>
                  {linea.nombre} ({linea.estado})
                </option>
              ))}
            </select>

            {/* Materias primas */}
            <h4 className="font-semibold mb-2">Materias Primas necesarias:</h4>
            <ul className="mb-4 text-sm">
              {materiasPrimas[selectedOrden.id].map((mp) => (
                <li key={mp.id}>
                  {mp.nombre}: {mp.requerido} (Stock: {mp.stock}){" "}
                  {mp.stock >= mp.requerido ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-400 text-white px-3 py-1 rounded"
                onClick={() => setSelectedOrden(null)}
              >
                Cancelar
              </button>
              <button
                className="bg-green-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
                disabled={!verificarStock(selectedOrden.id) || selectedLinea === null}
                onClick={confirmarAsignacion}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaOT;


