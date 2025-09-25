import React, { useState } from 'react';
import { Cliente } from '../models/Cliente';

interface FormNuevoClienteProps {
  onClose: () => void;
  onSave: (data: Cliente) => void;
}

const FormNuevoCliente: React.FC<FormNuevoClienteProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    mail: '',
    ciudad: '',
    direccion: '',
    provincia: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Nuevo Cliente</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="border p-2 w-full mb-2"
            placeholder="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Apellido"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            required
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Número de Teléfono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
            type="tel"
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Mail"
            name="mail"
            value={formData.mail}
            onChange={handleChange}
            required
            type="email"
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Ciudad"
            name="ciudad"
            value={formData.ciudad}
            onChange={handleChange}
            required
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Dirección"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            required
          />
          <input
            className="border p-2 w-full mb-4"
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
              className="px-4 py-2 border rounded hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
