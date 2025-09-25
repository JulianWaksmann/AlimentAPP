'use client';
import React, { useState, useEffect } from "react";
import FormNuevoCliente from "../../../../components/FormNuevoCliente";
import { Cliente } from "@/app/models/Cliente";
import ClienteTable from "@/app/components/ClientesTable";
import clientesData from "../../../../../data/clientes.json";
import ClienteModal from "@/app/components/ClienteModal";

const GestionClientesPage = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [modalNuevoClienteVisible, setModalNuevoClienteVisible] = useState(false);

    useEffect(() => {
    setClientes(clientesData);
  }, []);

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setModalVisible(true);
  };

  const handleDelete = (mail : string) => {
    setClientes(clientes.filter((c) => c.mail !== mail));
  }

  const guardarCliente = (data: Cliente) => {
    console.log("Datos guardados", data);
    setModalNuevoClienteVisible(false);
  };
  return (

    <>
      <button
        className="px-4 py-2 my-5 bg-success text-white rounded"
        onClick={() => setModalNuevoClienteVisible(true)}
      >
        Agregar nuevo cliente
      </button>

      <ClienteTable clientes={clientes} onEdit={openEditModal} onDelete={handleDelete} />

      {modalNuevoClienteVisible && (
        <FormNuevoCliente
          onClose={() => setModalNuevoClienteVisible(false)}
          onSave={guardarCliente}
        />
      )}

      <ClienteModal  isOpen={modalVisible} onClose={() => setModalVisible(false)} onSave={guardarCliente} editingCliente={editingCliente}/>
    </>
  );
};

export default GestionClientesPage;