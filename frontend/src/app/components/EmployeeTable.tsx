import React, { useState } from "react";
import { Employee } from "../models/Employee";

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: number) => void;
}

const ITEMS_PER_PAGE = 10;

const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit, onDelete }) => {
  
  const [filterRol, setFilterRol] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<"id"|"nombre"|"apellido"|"rol">("id");
  const [sortAsc, setSortAsc] = useState(true);

  // Obtener roles únicos
  const uniqueRoles = Array.from(new Set(employees.map(e => e.rol))).filter(Boolean);

  // Filtrar por rol
  const filteredEmployees = employees.filter((employee) => {
    return filterRol === "Todos" || employee.rol.toLowerCase() === filterRol.toLowerCase();
  });

  // Ordenar
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let valueA = a[sortKey] ?? "";
    let valueB = b[sortKey] ?? "";
    if (sortKey === "id") {
      valueA = Number(valueA);
      valueB = Number(valueB);
      return sortAsc ? valueA - valueB : valueB - valueA;
    }
    return sortAsc
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  });

  const totalPages = Math.ceil(sortedEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = sortedEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="w-full  mx-auto p-2 md:p-4">
      <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={filterRol}
            onChange={(event) => {
              setFilterRol(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2 w-full md:w-auto"
          >
            <option value="Todos">Todos los roles</option>
            {uniqueRoles.map((rol) => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg bg-white shadow text-xs md:text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-2 py-2 cursor-pointer" onClick={() => {setSortKey('id');setSortAsc(sortKey==='id'? !sortAsc : true);}}>
                ID {sortKey==='id' ? (sortAsc ? '▲':'▼') : ''}
              </th>
              <th className="px-2 py-2 cursor-pointer" onClick={() => {setSortKey('nombre');setSortAsc(sortKey==='nombre'? !sortAsc : true);}}>
                Nombre {sortKey==='nombre' ? (sortAsc ? '▲':'▼') : ''}
              </th>
              <th className="px-2 py-2 cursor-pointer" onClick={() => {setSortKey('apellido');setSortAsc(sortKey==='apellido'? !sortAsc : true);}}>
                Apellido {sortKey==='apellido' ? (sortAsc ? '▲':'▼') : ''}
              </th>
              <th className="px-2 py-2 cursor-pointer" onClick={() => {setSortKey('rol');setSortAsc(sortKey==='rol'? !sortAsc : true);}}>
                Rol {sortKey==='rol' ? (sortAsc ? '▲':'▼') : ''}
              </th>
              <th className="px-2 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((employee) => (
              <tr key={employee.id} className="odd:bg-neutral-light even:bg-white">
                <td className="px-2 py-2">{employee.id}</td>
                <td className="px-2 py-2">{employee.nombre}</td>
                <td className="px-2 py-2">{employee.apellido}</td>
                <td className="px-2 py-2">{employee.rol}</td>
                <td className="flex gap-2 px-2 py-2">
                  <button
                    className="rounded bg-success px-2 py-1 text-white transition hover:opacity-90"
                    onClick={() => onEdit(employee)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded bg-error px-2 py-1 text-white transition hover:opacity-90"
                    onClick={() => employee.id !== undefined && onDelete(employee.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {paginatedEmployees.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No hay empleados para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col md:flex-row justify-end items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          className="rounded bg-gray-300 px-3 py-1 transition hover:bg-gray-400 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="px-3 py-1">
          Página {currentPage} de {totalPages || 1}
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

export default EmployeeTable;
