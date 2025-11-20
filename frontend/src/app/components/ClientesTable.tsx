"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Cliente } from '../models/Cliente';
import { updateCliente } from '../api/clientes';
import { Search, Edit, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { crearDireccion } from '../api/pedidosVenta';
import { IdDireccion } from '@/app/components/FormNuevoPedido';
import { GetNombreApellidoClientes } from '@/app/api/clientes';


const ClientesTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);

    const fetchClientes = async () => {
      try {
        const res = await GetNombreApellidoClientes();
        setClientes(res);
      } catch (error) {
        console.error("Error fetching clientes:", error);
      }
    };

  useEffect(() => {
    fetchClientes();
  }, []);

  const processedClientes = useMemo(() => {
    const filtered = clientes.filter(cliente =>
      `${cliente.nombre_contacto} ${cliente.apellido_contacto}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const nameA = `${a.nombre_contacto} ${a.apellido_contacto}`;
      const nameB = `${b.nombre_contacto} ${b.apellido_contacto}`;
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return filtered;
  }, [clientes, searchTerm, sortAsc]);

  const CLIENTS_PER_PAGE = 10;
  const totalPages = Math.ceil(processedClientes.length / CLIENTS_PER_PAGE);
  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * CLIENTS_PER_PAGE;
    const end = start + CLIENTS_PER_PAGE;
    return processedClientes.slice(start, end);
  }, [processedClientes, currentPage]);

  const handleEditClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
    fetchClientes();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCliente(null);

  };

  const handleUpdate = async (updatedCliente: Cliente) => {
    if (!updatedCliente.id) return;
    try {
      await updateCliente(updatedCliente);
      alert('Cliente actualizado con éxito!');
      handleModalClose();
      // Here you might want to trigger a refetch of the clientes data
    } catch (error) {
      console.error("Error updating client:", error);
      alert('Error al actualizar el cliente.');
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestión de Clientes</h2>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            placeholder="Buscar por nombre o razón social..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 transition"
        >
          Ordenar por Nombre {sortAsc ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
      </div>

      {/* Client List */}
      <div className="grid grid-cols-1 gap-4">
        {paginatedClientes.map(cliente => (
          <div key={cliente.id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <p className="font-bold text-lg text-primary">{cliente.razon_social}</p>
              <p className="font-bold text-md text-primary">{`${cliente.nombre_contacto} ${cliente.apellido_contacto}`}</p>

              <p className="text-sm text-gray-600">{cliente.email}</p>
              <p className='text-sm text-gray-600'>{cliente.telefono}</p>
              {/* <p className="text-sm text-gray-500">{cliente.ciudad}, {cliente.provincia}</p> */}
              {cliente.cuil && <p className="text-xs text-gray-500 mt-1">CUIL: {cliente.cuil}</p>}
              {cliente.direcciones_asociadas && cliente.direcciones_asociadas.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Direcciones Asociadas:</p>
                  <ul className="list-disc list-inside text-xs text-gray-600">
                    {cliente.direcciones_asociadas.map(direccion => (
                      <li key={direccion.id_direccion}>{direccion.direccion_text} </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => handleEditClick(cliente)}
              className="flex items-center gap-2 bg-success text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
            >
              <Edit size={16} />
              Modificar
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white border disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-gray-700 font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white border disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && selectedCliente && (
        <ClienteEditModal
          cliente={selectedCliente}
          onClose={handleModalClose}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
};

// --- Edit Modal Component ---
type ModalProps = {
  cliente: Cliente;
  onClose: () => void;
  onSave: (cliente: Cliente) => void;
};

const ClienteEditModal: React.FC<ModalProps> = ({ cliente, onClose, onSave }) => {
  const [formData, setFormData] = useState<Cliente>(cliente);
  const [agregarDireccion, setAgregarDireccion] = useState(false);
  const [nuevaCalle, setNuevaCalle] = useState<string>("");
  const [nuevoNumero, setNuevoNumero] = useState<string>("");
  const [nuevaCiudad, setNuevaCiudad] = useState<string>("");
  const [nuevaProvincia, setNuevaProvincia] = useState<string>("");
  const [IDDireccionNueva, setIDDireccionNueva] = useState<IdDireccion | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMsg, setModalMsg] = useState("");
    const [modalType, setModalType] = useState<"error" | "success">("error");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

    const verificarDireccion = async () => {
      if(!nuevaCalle || !nuevoNumero || !nuevaCiudad || !nuevaProvincia){
        setModalMsg("Por favor, completa todos los campos de la nueva dirección.");
        setModalType("error");
        setModalOpen(true);
        return;
      }
      try{
      const response = await crearDireccion(nuevaCalle, nuevoNumero, nuevaCiudad, nuevaProvincia, cliente.id ? cliente.id : 0);
      console.log("Respuesta de crearDireccion:", response);
      setIDDireccionNueva(response);
      console.log(response);
      setModalMsg("Direccion creada con éxito.");
        setModalType("success");
        setModalOpen(true);
        // setAbrirModalNuevaDireccion(false);
      } catch (error) {
        console.error("Error al crear la direccion:", error);
        setModalMsg(
          "Hubo un error al crear la direccion. Por favor, intenta nuevamente."
        );
        setModalType("error");
        setModalOpen(true);
      }
    }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className={`rounded-lg p-6 shadow-lg w-80 text-center ${modalType === "error"
                ? "bg-red-50 border border-red-300"
                : "bg-green-50 border border-green-300"
              }`}
          >
            <h3
              className={`text-lg font-bold mb-2 ${modalType === "error" ? "text-red-600" : "text-green-600"
                }`}
            >
              {modalType === "error" ? "Error" : "Éxito"}
            </h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button
              onClick={() => setModalOpen(false)}
              className={`px-4 py-2 rounded font-semibold ${modalType === "error"
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-white"
                } hover:opacity-90 transition`}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Modificar Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre_contacto" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input id="nombre_contacto" type="text" name="nombre_contacto" value={formData.nombre_contacto} onChange={handleChange} placeholder="Nombre" className="border p-2 rounded-lg w-full" />
            </div>
            <div>
              <label htmlFor="apellido_contacto" className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input id="apellido_contacto" type="text" name="apellido_contacto" value={formData.apellido_contacto} onChange={handleChange} placeholder="Apellido" className="border p-2 rounded-lg w-full" />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="border p-2 rounded-lg w-full" />
          </div>
          <div>
            <label htmlFor="razon_social" className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
            <input id="razon_social" type="text" name="razon_social" value={formData.razon_social || ''} onChange={handleChange} placeholder="Razón Social" className="border p-2 rounded-lg w-full" />
          </div>
          <div>
            <label htmlFor="cuil" className="block text-sm font-medium text-gray-700 mb-1">CUIL</label>
            <input id="cuil" type="text" name="cuil" value={formData.cuil || ''} onChange={handleChange} placeholder="CUIL" className="border p-2 rounded-lg w-full" />
          </div>
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input id="telefono" type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange} placeholder="Teléfono" className="border p-2 rounded-lg w-full" />
          </div>
          {cliente.direcciones_asociadas && cliente.direcciones_asociadas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direcciones Asociadas:</label>
              <ul className="list-disc list-inside text-xs text-gray-600">
                {cliente.direcciones_asociadas.map(direccion => (
                  <li key={direccion.id_direccion}>{direccion.direccion_text} </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <button className='bg-primary text-white text-sm rounded p-2 te ' onClick={() => setAgregarDireccion(true)}>+ Agregar Direccion</button>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Guardar Cambios</button>
          </div>

        </form>
      </div>
      {agregarDireccion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-100 p-4">
          <div className="border p-4 mt-4 rounded bg-neutral-light">
            <div className="">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Calle
              </label>
              <input
                type="text"
                value={nuevaCalle}
                placeholder="Ingrese la nueva direccion"
                onChange={(e) => setNuevaCalle(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Numero
              </label>
              <input
                type="number"
                placeholder="Ingrese el numero"
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Ciudad
              </label>
              <input
                type="text"
                value={nuevaCiudad}
                placeholder="Ingrese la ciudad"
                onChange={(e) => setNuevaCiudad(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Provincia
              </label>
              <input
                type="text"
                value={nuevaProvincia}
                placeholder="Ingrese la provincia"
                onChange={(e) => setNuevaProvincia(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">

            </div>
            <button
              onClick={() => {
                // setSeleccionoEnvioNuevADireccion(false);
                setAgregarDireccion(false);
              }}
              className="mt-2 text-sm border rounded bg-error text-white px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                // setIdDireccionSeleccionada(null);
                // setSeleccionoEnvioNuevADireccion(true);
                setAgregarDireccion(false);
                verificarDireccion();
              }}
              className="mt-2 text-sm border rounded bg-success text-white px-4 py-2"
            >
              {" "}
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesTable;