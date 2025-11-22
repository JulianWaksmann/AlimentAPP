"use client";
import React, { useState } from "react";
import { createEmpleado } from "@/app/api/empleados";

const roles = ["rrhh", "operario", "gerente", "supervisor","vendedor", "calidad", "logistica"];

const NuevoEmpleadoPage = () => {
    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        dni: "",
        email: "",
        telefono: "",
        rol: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMsg, setModalMsg] = useState("");
    const [modalType, setModalType] = useState<"error"|"success">("success");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setModalOpen(false);
        try {
            await createEmpleado(form);
            setModalMsg("Empleado creado con éxito.");
            setModalType("success");
            setForm({ nombre: "", apellido: "", dni: "", email: "", telefono: "", rol: "", password: "" });
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Error al crear empleado.";
            setModalMsg(errorMsg);
            setModalType("error");
        }
        setLoading(false);
        setModalOpen(true);
    };

    return (
        <div className=" flex flex-col items-center justify-center bg-gray-50 px-2">
            <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 mt-6">
                <h2 className="text-2xl font-bold text-center mb-4 text-primary">Nuevo Empleado</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input name="nombre" type="text" required placeholder="Nombre" value={form.nombre} onChange={handleChange} className="rounded border px-3 py-2" />
                    <input name="apellido" type="text" required placeholder="Apellido" value={form.apellido} onChange={handleChange} className="rounded border px-3 py-2" />
                    <input name="dni" type="text" required placeholder="DNI" value={form.dni} onChange={handleChange} className="rounded border px-3 py-2" />
                    <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className="rounded border px-3 py-2" />
                    <input name="telefono" type="text" required placeholder="Teléfono" value={form.telefono} onChange={handleChange} className="rounded border px-3 py-2" />
                    <select name="rol" required value={form.rol} onChange={handleChange} className="rounded border px-3 py-2">
                        <option value="">Seleccionar rol</option>
                        {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    <input name="password" type="password" required placeholder="Contraseña" value={form.password} onChange={handleChange} className="rounded border px-3 py-2" />
                    <button type="submit" disabled={loading} className="bg-primary text-white rounded py-2 font-semibold mt-2 hover:opacity-90 transition">
                        {loading ? "Creando..." : "Crear Empleado"}
                    </button>
                </form>
            </div>
            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className={`rounded-lg p-6 shadow-lg w-80 text-center ${modalType === "error" ? "bg-red-50 border border-red-300" : "bg-green-50 border border-green-300"}`}>
                        <h3 className={`text-lg font-bold mb-2 ${modalType === "error" ? "text-red-600" : "text-green-600"}`}>{modalType === "error" ? "Error" : "Éxito"}</h3>
                        <p className="mb-4 text-sm">{modalMsg}</p>
                        <button onClick={() => setModalOpen(false)} className={`px-4 py-2 rounded font-semibold ${modalType === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"} hover:opacity-90 transition`}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NuevoEmpleadoPage;