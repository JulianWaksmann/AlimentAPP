import React, { useState, useEffect } from "react";
import { Cliente } from "../models/Cliente";

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cliente: Cliente) => void;
  editingCliente?: Cliente | null;
}

const ClienteModal: React.FC<ClienteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCliente,
}) => {
  const [form, setForm] = useState<Cliente>({
    nombre: "",
    apellido: "",
    telefono: "",
    mail: "",
    ciudad: "",
    direccion: "",
    provincia: "",
  });

  useEffect(() => {
    if (editingCliente) {
      setForm(editingCliente);
    } else {
      setForm({
        nombre: "",
        apellido: "",
        telefono: "",
        mail: "",
        ciudad: "",
        direccion: "",
        provincia: "",
      });
    }
  }, [editingCliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          {editingCliente ? "Editar Cliente" : "Agregar Cliente"}
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
          <input
            type="tel"
            name="telefono"
            placeholder="Número de Teléfono"
            value={form.telefono}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />
          <input
            type="email"
            name="mail"
            placeholder="Mail"
            value={form.mail}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />
          <input
            type="text"
            name="ciudad"
            placeholder="Ciudad"
            value={form.ciudad}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />
          <input
            type="text"
            name="direccion"
            placeholder="Dirección"
            value={form.direccion}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />
          <input
            type="text"
            name="provincia"
            placeholder="Provincia"
            value={form.provincia}
            onChange={handleChange}
            className="border border-gray-300 rounded px-3 py-2"
            required
          />

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

export default ClienteModal;
