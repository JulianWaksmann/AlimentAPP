import React, { useState } from "react";
import { Employee } from "../models/Employee";

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: number) => void;
}

const ITEMS_PER_PAGE = 5;

const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit, onDelete }) => {
  const [filterRol, setFilterRol] = useState("Todos");
  const [filterArea, setFilterArea] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEmployees = employees.filter((employee) => {
    const roleMatch = filterRol === "Todos" || employee.rol.toLowerCase() === filterRol.toLowerCase();
    const areaMatch = filterArea === "Todos" || employee.area.toLowerCase() === filterArea.toLowerCase();
    return roleMatch && areaMatch;
  });

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <select
            value={filterRol}
            onChange={(event) => {
              setFilterRol(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option>Todos</option>
            <option>Operario</option>
            <option>Supervisor</option>
            <option>Calidad</option>
            <option>Jefe</option>
          </select>
          <select
            value={filterArea}
            onChange={(event) => {
              setFilterArea(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option>Todos</option>
            <option>Produccion</option>
            <option>Envasado</option>
            <option>Deposito</option>
            <option>Calidad</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg bg-white shadow">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Apellido</th>
              <th className="px-6 py-3 text-left">Rol</th>
              <th className="px-6 py-3 text-left">Area</th>
              <th className="px-6 py-3 text-left">Turno</th>
              <th className="px-6 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((employee) => (
              <tr key={employee.id} className="odd:bg-neutral-light even:bg-white">
                <td className="px-6 py-3">{employee.nombre}</td>
                <td className="px-6 py-3">{employee.apellido}</td>
                <td className="px-6 py-3">{employee.rol}</td>
                <td className="px-6 py-3">{employee.area}</td>
                <td className="px-6 py-3">{employee.turno}</td>
                <td className="flex gap-2 px-6 py-3">
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
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No hay empleados para mostrar.
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

export default EmployeeTable;
