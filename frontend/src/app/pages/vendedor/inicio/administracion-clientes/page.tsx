'use client';

import ClienteTable from "@/app/components/ClientesTable";
import React, { useState } from "react"; 


const GestionClientesPage = () => {
  // --- Estados del formulario ---
  const [formData, setFormData] = useState({
    razon_social: "",
    email: "",
    cuil: "",
    nombre_contacto: "",
    apellido_contacto: "",
    telefono: "",
  });

  // --- Estados del Modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState<"error" | "success">("error");
  const [abrirCrearCliente, setAbrirCrearCliente] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const limpiarFormulario = () => {
    setFormData({
      razon_social: "",
      email: "",
      cuil: "",
      nombre_contacto: "",
      apellido_contacto: "",
      telefono: "",
    });
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Validación simple ---
    if (!formData.razon_social || !formData.email || !formData.cuil) {
      setModalMsg("Razón Social, Email y CUIL son campos obligatorios.");
      setModalType("error");
      setModalOpen(true);
      return;
    }

    try {
      const response = await fetch("https://eldzogehdj.execute-api.us-east-1.amazonaws.com/prd/cliente/post-crear-cliente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error del servidor");
      }

      setModalMsg("Cliente creado con éxito.");
      setModalType("success");
      setModalOpen(true);
      limpiarFormulario();
      setAbrirCrearCliente(false);
      window.location.reload();


    } catch (error: unknown) {
      console.error("Error al crear el cliente:", error);
      const message = error instanceof Error ? error.message : String(error);
      setModalMsg(`Hubo un error al crear el cliente: ${message}`);
      setModalType("error");
      setModalOpen(true);
    }
  };

  return (
    <div>
      {/* Modal de feedback */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className={`rounded-lg p-6 shadow-lg w-80 text-center ${
              modalType === "error"
                ? "bg-red-50 border border-red-300"
                : "bg-green-50 border border-green-300"
            }`}
          >
            <h3
              className={`text-lg font-bold mb-2 ${
                modalType === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {modalType === "error" ? "Error" : "Éxito"}
            </h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button
              onClick={() => setModalOpen(false)}
              className={`px-4 py-2 rounded font-semibold ${
                modalType === "error"
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-white"
              } hover:opacity-90 transition`}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      {!abrirCrearCliente &&(
      <button className="rounded bg-primary text-white px-4 py-2 m-2" onClick={() => setAbrirCrearCliente(true)}>Crear Cliente</button>
      )}


      {/* Formulario de Creación */}
      {abrirCrearCliente && (
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-4 shadow-lg md:p-6 mb-8">
        <h2 className="mb-6 text-center text-xl font-bold text-primary">
          Crear Nuevo Cliente
        </h2>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label htmlFor="razon_social" className="mb-1 block text-sm font-medium">
              Razón Social <span className="text-red-600">*</span>
            </label>
            <input
              id="razon_social"
              name="razon_social"
              type="text"
              value={formData.razon_social}
              onChange={handleInputChange}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="cuil" className="mb-1 block text-sm font-medium">
              CUIL <span className="text-red-600">*</span>
            </label>
            <input
              id="cuil"
              name="cuil"
              type="text"
              value={formData.cuil}
              onChange={handleInputChange}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre_contacto" className="mb-1 block text-sm font-medium">
                Nombre del Contacto
              </label>
              <input
                id="nombre_contacto"
                name="nombre_contacto"
                type="text"
                value={formData.nombre_contacto}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="apellido_contacto" className="mb-1 block text-sm font-medium">
                Apellido del Contacto
              </label>
              <input
                id="apellido_contacto"
                name="apellido_contacto"
                type="text"
                value={formData.apellido_contacto}
                onChange={handleInputChange}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="telefono" className="mb-1 block text-sm font-medium">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              value={formData.telefono}
              onChange={handleInputChange}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          
          <div className="mt-8 flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {limpiarFormulario(); setAbrirCrearCliente(false);}}
              className="rounded bg-neutral-dark px-6 py-2 text-white transition hover:opacity-90"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="rounded bg-success px-6 py-2 text-white transition hover:opacity-90"
            >
              Crear Cliente
            </button>
          </div>
        </form>
      </div>
      )}
      {/* Tabla de Clientes Existentes */}
      <ClienteTable />
    </div>
  );
};

export default GestionClientesPage;

