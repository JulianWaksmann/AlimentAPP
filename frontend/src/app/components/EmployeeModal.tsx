import React, { useState, useEffect } from "react";
import { Employee } from "../models/Employee";


// interface Employee {
//   id?: number;
//   nombre: string;
//   apellido: string;
//   rol: string;
//   area: string;
//   turno: string;
// }

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  editingEmployee?: Employee | null;
}

const ROLES = ["Operario", "Supervisor", "Calidad", "Jefe"];
const AREAS = ["Producción", "Envasado", "Depósito", "Calidad"];
const TURNOS = ["Mañana", "Tarde", "Noche"];

const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEmployee,
}) => {
  const [form, setForm] = useState<Employee>({
    nombre: "",
    apellido: "",
    rol: "",
    area: "",
    turno: "",
  });

  useEffect(() => {
    if (editingEmployee) {
      setForm(editingEmployee);
    } else {
      setForm({ nombre: "", apellido: "", rol: "", area: "", turno: "" });
    }
  }, [editingEmployee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-md">
        <h2 className="text-xl font-bold mb-4">
          {editingEmployee ? "Editar Empleado" : "Agregar Empleado"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={form.nombre}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />
          <input
            type="text"
            name="apellido"
            placeholder="Apellido"
            value={form.apellido}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />

          {/* Select Rol */}
          <select
            name="rol"
            value={form.rol}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar Rol</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Select Área */}
          <select
            name="area"
            value={form.area}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar Área</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Select Turno */}
          <select
            name="turno"
            value={form.turno}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar Turno</option>
            {TURNOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="bg-neutral-dark text-white px-4 py-2 rounded hover:opacity-90 transition"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-success text-white px-4 py-2 rounded hover:opacity-90 transition"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;
