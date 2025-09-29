// 'use client';

// import React, { useEffect, useState } from "react";
// import Header from "@/app/components/Header";
// // import ClienteModal from "@/app/components/ClienteModal";
// import ClienteTable from "@/app/components/ClientesTable";
// import FormNuevoCliente from "@/app/components/FormNuevoCliente";
// import { Cliente } from "@/app/models/Cliente";
// import clientesData from "@/data/clientes.json";

const GestionClientesPage = () => {
  return <div>Gestión de Clientes - En construcción</div>;
//   const [clientes, setClientes] = useState<Cliente[]>([]);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [modalNuevoClienteVisible, setModalNuevoClienteVisible] = useState(false);
//   const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

//   // useEffect(() => {
//   //   setClientes(clientesData);
//   // }, []);

//   const openEditModal = (cliente: Cliente) => {
//     setEditingCliente(cliente);
//     setModalVisible(true);
//   };

//   const handleDelete = (mail: string) => {
//     setClientes((actuales) => actuales.filter((cliente) => cliente.email !== mail));
//   };

//   const guardarCliente = (cliente: Cliente) => {
//     setClientes((actuales) => {
//       const existe = actuales.some((item) => item.email === cliente.email);
//       if (existe) {
//         return actuales.map((item) => (item.email === cliente.email ? cliente : item));
//       }
//       return [...actuales, cliente];
//     });
//     setModalNuevoClienteVisible(false);
//     setModalVisible(false);
//     setEditingCliente(null);
//   };

//   return (
//     <div className="min-h-screen bg-neutral-light">
//       <Header />
//       <main className="p-6 space-y-6">
//         <div className="flex justify-end">
//           <button
//             className="rounded bg-success px-4 py-2 font-semibold text-white transition hover:opacity-90"
//             onClick={() => setModalNuevoClienteVisible(true)}
//           >
//             Agregar nuevo cliente
//           </button>
//         </div>

//         <ClienteTable clientes={clientes} onEdit={openEditModal} onDelete={handleDelete} />

//         {modalNuevoClienteVisible && (
//           <FormNuevoCliente
//             onClose={() => setModalNuevoClienteVisible(false)}
//             onSave={guardarCliente}
//           />
//         )}

//         <ClienteModal
//           isOpen={modalVisible}
//           onClose={() => {
//             setModalVisible(false);
//             setEditingCliente(null);
//           }}
//           onSave={guardarCliente}
//           editingCliente={editingCliente}
//         />
//       </main>
//     </div>
//   );
};

export default GestionClientesPage;

