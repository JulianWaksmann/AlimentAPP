import React, { useState } from "react";
import { Cliente } from "../models/Cliente";

interface ClienteTableProps {
  clientes: Cliente[];
  onEdit: (cliente: Cliente) => void;
  onDelete: (mail: string) => void;  // Usamos mail como id único aquí
}

const ITEMS_PER_PAGE = 5;

const ClienteTable: React.FC<ClienteTableProps> = ({ clientes, onEdit, onDelete }) => {
  const [filterCiudad, setFilterCiudad] = useState("Todos");
  const [filterProvincia, setFilterProvincia] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrado
  const filteredClientes = clientes.filter((cli) => {
    const ciudadMatch = filterCiudad === "Todos" || cli.ciudad.toLowerCase() === filterCiudad.toLowerCase();
    const provinciaMatch = filterProvincia === "Todos" || cli.provincia.toLowerCase() === filterProvincia.toLowerCase();
    return ciudadMatch && provinciaMatch;
  });

  // Paginación
  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div>
      {/* Filtros */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex gap-2">
          <select
            value={filterCiudad}
            onChange={(e) => setFilterCiudad(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option>Todos</option>
            {[...new Set(clientes.map((c) => c.ciudad))].map((ciudad) => (
              <option key={ciudad}>{ciudad}</option>
            ))}
          </select>
          <select
            value={filterProvincia}
            onChange={(e) => setFilterProvincia(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option>Todos</option>
            {[...new Set(clientes.map((c) => c.provincia))].map((provincia) => (
              <option key={provincia}>{provincia}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Apellido</th>
              <th className="px-6 py-3 text-left">Teléfono</th>
              <th className="px-6 py-3 text-left">Mail</th>
              <th className="px-6 py-3 text-left">Ciudad</th>
              <th className="px-6 py-3 text-left">Dirección</th>
              <th className="px-6 py-3 text-left">Provincia</th>
              <th className="px-6 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClientes.map((cli) => (
              <tr key={cli.mail} className="odd:bg-neutral-light even:bg-white">
                <td className="px-6 py-3">{cli.nombre}</td>
                <td className="px-6 py-3">{cli.apellido}</td>
                <td className="px-6 py-3">{cli.telefono}</td>
                <td className="px-6 py-3">{cli.mail}</td>
                <td className="px-6 py-3">{cli.ciudad}</td>
                <td className="px-6 py-3">{cli.direccion}</td>
                <td className="px-6 py-3">{cli.provincia}</td>
                <td className="px-6 py-3 flex gap-2">
                  <button
                    className="bg-success text-white px-2 py-1 rounded hover:opacity-90 transition"
                    onClick={() => onEdit(cli)}
                  >
                    Editar
                  </button>
                  <button
                    className="bg-error text-white px-2 py-1 rounded hover:opacity-90 transition"
                    onClick={() => onDelete(cli.mail)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {paginatedClientes.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">
                  No hay clientes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="px-3 py-1">
          Página {currentPage} de {totalPages || 1}
        </span>
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default ClienteTable;
