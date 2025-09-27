import React, { useState, useEffect } from "react";
import { Employee } from "../models/Employee";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  editingEmployee?: Employee | null;
}

const ROLES = ["Operario", "Supervisor", "Calidad", "Jefe"];
const AREAS = ["Produccion", "Envasado", "Deposito", "Calidad"];
const TURNOS = ["Manana", "Tarde", "Noche"];

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

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(form);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold">
          {editingEmployee ? "Editar empleado" : "Agregar empleado"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={form.nombre}
            onChange={handleChange}
            className="rounded border border-gray-300 px-3 py-2"
            required
          />
          <input
            type="text"
            name="apellido"
            placeholder="Apellido"
            value={form.apellido}
            onChange={handleChange}
            className="rounded border border-gray-300 px-3 py-2"
            required
          />
          <select
            name="rol"
            value={form.rol}
            onChange={handleChange}
            className="rounded border border-gray-300 px-3 py-2"
            required
          >
            <option value="">Seleccionar rol</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            name="area"
            value={form.area}
            onChange={handleChange}
            className="rounded border border-gray-300 px-3 py-2"
            required
          >
            <option value="">Seleccionar area</option>
            {AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <select
            name="turno"
            value={form.turno}
            onChange={handleChange}
            className="rounded border border-gray-300 px-3 py-2"
            required
          >
            <option value="">Seleccionar turno</option>
            {TURNOS.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded bg-neutral-dark px-4 py-2 text-white transition hover:opacity-90"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded bg-success px-4 py-2 text-white transition hover:opacity-90"
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
