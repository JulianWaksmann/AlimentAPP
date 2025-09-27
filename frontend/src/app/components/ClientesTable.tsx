import React, { useState } from "react";
import { Cliente } from "../models/Cliente";

interface ClienteTableProps {
  clientes: Cliente[];
  onEdit: (cliente: Cliente) => void;
  onDelete: (mail: string) => void;
}

const ITEMS_PER_PAGE = 5;

const ClienteTable: React.FC<ClienteTableProps> = ({ clientes, onEdit, onDelete }) => {
  const [filterCiudad, setFilterCiudad] = useState("Todos");
  const [filterProvincia, setFilterProvincia] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredClientes = clientes.filter((cliente) => {
    const ciudadMatch =
      filterCiudad === "Todos" || cliente.ciudad.toLowerCase() === filterCiudad.toLowerCase();
    const provinciaMatch =
      filterProvincia === "Todos" || cliente.provincia.toLowerCase() === filterProvincia.toLowerCase();
    return ciudadMatch && provinciaMatch;
  });

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <select
            value={filterCiudad}
            onChange={(event) => {
              setFilterCiudad(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option>Todos</option>
            {[...new Set(clientes.map((cliente) => cliente.ciudad))].map((ciudad) => (
              <option key={ciudad}>{ciudad}</option>
            ))}
          </select>
          <select
            value={filterProvincia}
            onChange={(event) => {
              setFilterProvincia(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option>Todos</option>
            {[...new Set(clientes.map((cliente) => cliente.provincia))].map((provincia) => (
              <option key={provincia}>{provincia}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg bg-white shadow">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Apellido</th>
              <th className="px-6 py-3 text-left">Telefono</th>
              <th className="px-6 py-3 text-left">Mail</th>
              <th className="px-6 py-3 text-left">Ciudad</th>
              <th className="px-6 py-3 text-left">Direccion</th>
              <th className="px-6 py-3 text-left">Provincia</th>
              <th className="px-6 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClientes.map((cliente) => (
              <tr key={cliente.mail} className="odd:bg-neutral-light even:bg-white">
                <td className="px-6 py-3">{cliente.nombre}</td>
                <td className="px-6 py-3">{cliente.apellido}</td>
                <td className="px-6 py-3">{cliente.telefono}</td>
                <td className="px-6 py-3">{cliente.mail}</td>
                <td className="px-6 py-3">{cliente.ciudad}</td>
                <td className="px-6 py-3">{cliente.direccion}</td>
                <td className="px-6 py-3">{cliente.provincia}</td>
                <td className="flex gap-2 px-6 py-3">
                  <button
                    className="rounded bg-success px-2 py-1 text-white transition hover:opacity-90"
                    onClick={() => onEdit(cliente)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded bg-error px-2 py-1 text-white transition hover:opacity-90"
                    onClick={() => onDelete(cliente.mail)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {paginatedClientes.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-gray-500">
                  No hay clientes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          className="rounded bg-gray-300 px-3 py-1 transition hover:bg-gray-400 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="px-3 py-1">
          Pagina {currentPage} de {totalPages || 1}
        </span>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage((page) => Math.min(totalPages || 1, page + 1))}
          className="rounded bg-gray-300 px-3 py-1 transition hover:bg-gray-400 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default ClienteTable;
