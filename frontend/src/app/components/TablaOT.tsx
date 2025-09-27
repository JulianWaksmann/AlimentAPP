"use client";

import React, { useState } from "react";

type OrdenTrabajo = {
  id: number;
  cliente: string;
  producto: string;
  cantidad: number;
  fechaEntrega: string;
  estado: string;
};

type LineaProduccion = {
  id: number;
  nombre: string;
  estado: string;
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
        `Orden ${selectedOrden.id} asignada a la linea ${selectedLinea}. Se coloca en cola si la linea esta ocupada.`,
      );
      setSelectedOrden(null);
      setSelectedLinea(null);
    }
  };

  const verificarStock = (idOrden: number) => {
    const materias = materiasPrimas[idOrden];
    if (!materias) {
      return false;
    }
    return materias.every((materia) => materia.stock >= materia.requerido);
  };

  const sortedOrdenes = [...ordenes].sort((a, b) => {
    if (!sortConfig) {
      return 0;
    }
    const { key, direction } = sortConfig;
    const valueA = key === "fechaEntrega" ? new Date(a[key]).getTime() : (a[key] as string | number);
    const valueB = key === "fechaEntrega" ? new Date(b[key]).getTime() : (b[key] as string | number);

    if (valueA < valueB) {
      return direction === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return direction === "asc" ? 1 : -1;
    }
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
    if (!sortConfig || sortConfig.key !== key) {
      return "";
    }
    return sortConfig.direction === "asc" ? " ^" : " v";
  };

  const materiasSeleccionadas = selectedOrden ? materiasPrimas[selectedOrden.id] ?? [] : [];

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-4 text-xl font-bold">Ordenes de trabajo</h2>
      <table className="min-w-full text-sm">
        <thead className="bg-primary text-white">
          <tr>
            <th className="cursor-pointer px-3 py-2 text-left" onClick={() => requestSort("id")}>
              ID{renderSortArrow("id")}
            </th>
            <th className="cursor-pointer px-3 py-2 text-left" onClick={() => requestSort("cliente")}>
              Cliente{renderSortArrow("cliente")}
            </th>
            <th className="cursor-pointer px-3 py-2 text-left" onClick={() => requestSort("producto")}>
              Producto{renderSortArrow("producto")}
            </th>
            <th className="px-3 py-2 text-left">Cantidad</th>
            <th className="cursor-pointer px-3 py-2 text-left" onClick={() => requestSort("fechaEntrega")}>
              Entrega{renderSortArrow("fechaEntrega")}
            </th>
            <th className="cursor-pointer px-3 py-2 text-left" onClick={() => requestSort("estado")}>
              Estado{renderSortArrow("estado")}
            </th>
            <th className="px-3 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrdenes.map((orden) => (
            <tr key={orden.id} className="odd:bg-neutral-light">
              <td className="px-3 py-2">{orden.id}</td>
              <td className="px-3 py-2">{orden.cliente}</td>
              <td className="px-3 py-2">{orden.producto}</td>
              <td className="px-3 py-2">{orden.cantidad}</td>
              <td className="px-3 py-2">{orden.fechaEntrega}</td>
              <td className="px-3 py-2">{orden.estado}</td>
              <td className="px-3 py-2">
                <button
                  className="rounded bg-success px-3 py-1 text-white transition hover:opacity-90"
                  onClick={() => handleAsignar(orden)}
                >
                  Asignar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Asignar orden #{selectedOrden.id}</h3>
            <label className="mb-2 block font-semibold">Linea de produccion</label>
            <select
              className="mb-4 w-full rounded border px-2 py-2"
              value={selectedLinea ?? ""}
              onChange={(event) => setSelectedLinea(Number(event.target.value))}
            >
              <option value="">Selecciona una linea</option>
              {lineas.map((linea) => (
                <option key={linea.id} value={linea.id}>
                  {linea.nombre} ({linea.estado})
                </option>
              ))}
            </select>

            <h4 className="mb-2 font-semibold">Materias primas requeridas</h4>
            <ul className="mb-4 space-y-1 text-sm">
              {materiasSeleccionadas.map((materia) => (
                <li
                  key={materia.id}
                  className={materia.stock >= materia.requerido ? "text-success" : "text-error"}
                >
                  {materia.nombre}: {materia.requerido} (stock {materia.stock})
                </li>
              ))}
              {materiasSeleccionadas.length === 0 && (
                <li className="text-neutral-dark">No hay recursos definidos para esta orden.</li>
              )}
            </ul>

            <div className="flex justify-end gap-2">
              <button
                className="rounded bg-gray-300 px-3 py-1 transition hover:bg-gray-400"
                onClick={() => setSelectedOrden(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-success px-3 py-1 text-white transition hover:opacity-90 disabled:bg-gray-400"
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
