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

  // Filtrado
  const filteredEmployees = employees.filter((emp) => {
    const rolMatch = filterRol === "Todos" || emp.rol.toLowerCase() === filterRol.toLowerCase();
    const areaMatch = filterArea === "Todos" || emp.area.toLowerCase() === filterArea.toLowerCase();
    return rolMatch && areaMatch;
  });

  // Paginación
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div>
      {/* Filtros y agregar */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex gap-2">
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option>Todos</option>
            <option>Operario</option>
            <option>Supervisor</option>
            <option>Calidad</option>
            <option>Jefe</option>
          </select>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option>Todos</option>
            <option>Producción</option>
            <option>Envasado</option>
            <option>Depósito</option>
            <option>Calidad</option>
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
              <th className="px-6 py-3 text-left">Rol</th>
              <th className="px-6 py-3 text-left">Área</th>
              <th className="px-6 py-3 text-left">Turno</th>
              <th className="px-6 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((emp) => (
              <tr key={emp.id} className="odd:bg-neutral-light even:bg-white">
                <td className="px-6 py-3">{emp.nombre}</td>
                <td className="px-6 py-3">{emp.apellido}</td>
                <td className="px-6 py-3">{emp.rol}</td>
                <td className="px-6 py-3">{emp.area}</td>
                <td className="px-6 py-3">{emp.turno}</td>
                <td className="px-6 py-3 flex gap-2">
                  <button
                    className="bg-success text-white px-2 py-1 rounded hover:opacity-90 transition"
                    onClick={() => onEdit(emp)}
                  >
                    Editar
                  </button>
                  <button
                    className="bg-error text-white px-2 py-1 rounded hover:opacity-90 transition"
                    onClick={() => emp.id !== undefined && onDelete(emp.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {paginatedEmployees.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No hay empleados para mostrar.
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

export default EmployeeTable;
