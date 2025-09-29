// import React, { useEffect, useState } from "react";
// import { Cliente } from "../models/Cliente";

// interface ClienteModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSave: (cliente: Cliente) => void;
//   editingCliente?: Cliente | null;
// }

// const ClienteModal: React.FC<ClienteModalProps> = ({ isOpen, onClose, onSave, editingCliente }) => {
//   const [form, setForm] = useState<Cliente>({
//     nombre_contacto: "",
//     apellido_contacto: "",
//     telefono: "",
//     email: "",
//     ciudad: "",
//     direccion: "",
//     provincia: "",
//   });

//   useEffect(() => {
//     if (editingCliente) {
//       setForm(editingCliente);
//     } else {
//       setForm({
//         nombre_contacto: "",
//         apellido_contacto: "",
//         telefono: "",
//         email: "",
//         ciudad: "",
//         direccion: "",
//         provincia: "",
//       });
//     }
//   }, [editingCliente]);

//   if (!isOpen) {
//     return null;
//   }

//   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     setForm({ ...form, [event.target.name]: event.target.value });
//   };

//   const handleSubmit = (event: React.FormEvent) => {
//     event.preventDefault();
//     onSave(form);
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
//         <h2 className="mb-4 text-xl font-bold">
//           {editingCliente ? "Editar cliente" : "Agregar cliente"}
//         </h2>
//         <form onSubmit={handleSubmit} className="flex flex-col gap-3">
//           <input
//             type="text"
//             name="nombre"
//             placeholder="Nombre"
//             value={form.nombre_contacto}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <input
//             type="text"
//             name="apellido"
//             placeholder="Apellido"
//             value={form.apellido_contacto}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <input
//             type="tel"
//             name="telefono"
//             placeholder="Numero de telefono"
//             value={form.telefono}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <input
//             type="email"
//             name="mail"
//             placeholder="Mail"
//             value={form.email}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <input
//             type="text"
//             name="ciudad"
//             placeholder="Ciudad"
//             value={form.ciudad}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <input
//             type="text"
//             name="direccion"
//             placeholder="Direccion"
//             value={form.direccion}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <input
//             type="text"
//             name="provincia"
//             placeholder="Provincia"
//             value={form.provincia}
//             onChange={handleChange}
//             className="rounded border border-gray-300 px-3 py-2"
//             required
//           />
//           <div className="mt-4 flex justify-end gap-2">
//             <button
//               type="button"
//               className="rounded bg-neutral-dark px-4 py-2 text-white transition hover:opacity-90"
//               onClick={onClose}
//             >
//               Cancelar
//             </button>
//             <button
//               type="submit"
//               className="rounded bg-success px-4 py-2 text-white transition hover:opacity-90"
//             >
//               Guardar
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ClienteModal;
