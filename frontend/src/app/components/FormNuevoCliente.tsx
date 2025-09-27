import React, { useState } from "react";
import { Cliente } from "../models/Cliente";

interface FormNuevoClienteProps {
  onClose: () => void;
  onSave: (data: Cliente) => void;
}

const FormNuevoCliente: React.FC<FormNuevoClienteProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Cliente>({
    nombre: "",
    apellido: "",
    telefono: "",
    mail: "",
    ciudad: "",
    direccion: "",
    provincia: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">Nuevo cliente</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Apellido"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Numero de telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
            type="tel"
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Mail"
            name="mail"
            value={formData.mail}
            onChange={handleChange}
            required
            type="email"
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Ciudad"
            name="ciudad"
            value={formData.ciudad}
            onChange={handleChange}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Direccion"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Provincia"
            name="provincia"
            value={formData.provincia}
            onChange={handleChange}
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 transition hover:bg-gray-100"
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

export default FormNuevoCliente;
