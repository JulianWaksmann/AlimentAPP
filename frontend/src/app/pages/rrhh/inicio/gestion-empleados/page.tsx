"use client";
import { getEmpleados, updateEmpleado } from "@/app/api/empleados";
import { useState, useEffect} from "react";
import { Employee } from "@/app/models/Employee";


const GestionEmpleadosPage = () => {
    const [empleados, setEmpleados] = useState<Employee[]>([]);
    const [modalEdit, setModalEdit] = useState(false);
    const [empleadoEdit, setEmpleadoEdit] = useState<Employee | null>(null);
    const [nuevoTelefono, setNuevoTelefono] = useState("");
    const [nuevoEmail, setNuevoEmail] = useState("");

    const fetchEmpleados = async () => {
            const res = await getEmpleados();
            setEmpleados(res);
        };
    useEffect(() => {
        fetchEmpleados();
    }, []);

    async function Guardar() {
      if (empleadoEdit) {
        // Aquí iría la lógica para guardar los cambios, por ejemplo, una llamada a la API
       const updatedEmpleado = {
        id_empleado : empleadoEdit.id,
        nombre : empleadoEdit.nombre,
        apellido : empleadoEdit.apellido,
        telefono : nuevoTelefono,
        email : nuevoEmail
       }
        await updateEmpleado(updatedEmpleado);
       fetchEmpleados();
        console.log("Empleado actualizado:", updatedEmpleado);
        // Cerrar el modal después de guardar
        setModalEdit(false);
      }
    }



  return <div>
    <h2 className="text-2xl font-bold text-primary text-center">Listado de empleados</h2>

    <div className="mt-6 ">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead className="bg-gray-100">
          <tr >
            <th className="border px-1 py-2 text-sm">Nombre</th>
            <th className="border px-1 py-2 text-sm">Apellido</th>
            <th className="border px-1 py-2 text-sm">Rol</th>
            <th className="border px-1 py-2 text-sm">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((empleado) => (
            <tr key={empleado.id}>
              <td className="border px-1 py-2 text-sm font-semibold">{empleado.nombre}</td>
              <td className="border px-1 py-2 text-sm font-semibold">{empleado.apellido}</td>
              <td className="border px-1 py-2 text-sm font-semibold">{empleado.rol}</td>
              <td className="border px-1 py-2 text-sm">
                <button className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                onClick={()=> {setModalEdit(true); setEmpleadoEdit(empleado); setNuevoEmail(empleado.email); setNuevoTelefono(empleado.telefono)}}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {
      modalEdit && empleadoEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-xl font-bold mb-4">Editar Empleado</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  defaultValue={empleadoEdit.nombre}
                  disabled
                  className="w-full border border-gray-300 px-2 py-1 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Apellido</label>
                <input
                disabled
                  type="text"
                  defaultValue={empleadoEdit.apellido}
                  className="w-full border border-gray-300 px-2 py-1 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">DNI</label>
                <input
                  type="text"
                  defaultValue={empleadoEdit.dni}
                  disabled
                  className="w-full border border-gray-300 px-2 py-1 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Rol</label>
                <input
                  type="text"
                  defaultValue={empleadoEdit.rol}
                  disabled
                  className="w-full border border-gray-300 px-2 py-1 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={empleadoEdit.email}
                  className="w-full border border-gray-300 px-2 py-1 rounded"
                  onChange={(e) => setNuevoEmail(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  type="text"
                  defaultValue={empleadoEdit.telefono}
                  className="w-full border border-gray-300 px-2 py-1 rounded"
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="bg-gray-500 text-white px-4 py-2 rounded mr-2"
                  onClick={() => setModalEdit(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={()=>{Guardar(); setModalEdit(false);}}
                >
                  Guardar
                </button>
              </div>
          </div>
        </div>
      )
    }
 

  </div>;
};

export default GestionEmpleadosPage;
