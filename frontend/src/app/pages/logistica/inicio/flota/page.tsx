"use client";
import Header from "@/app/components/Header";
import React, { useEffect, useState } from "react";
import { Flota } from "@/app/models/Flota";
import { CreateFlota, GetFlotas} from "@/app/api/logistica";
import { TableFlotas } from "@/app/components/TableFlotas";

const FlotaPage = () => {
    const [abrirFormulario, setAbrirFormulario] = useState(false);
    const [listaFlotas, setListaFlotas] = useState<Flota[]>([]);
    const [flota, setFlota] = useState<Flota[]>([]);
    const [formData, setFormData] = useState({
        nombre_conductor: "",
        apellido_conductor: "",
        dni_conductor: "",
        empresa: "",
        tipo_unidad: "",
        patente: "",
        modelo: "",
        capacidad_kg: "",
        color: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const HandleEnviar = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const nuevaFlota: Flota = {
                nombre_conductor: formData.nombre_conductor,
                apellido_conductor: formData.apellido_conductor,
                dni_conductor: formData.dni_conductor,
                empresa: formData.empresa,
                tipo_unidad: formData.tipo_unidad as 'camion' | 'camioneta' | 'auto',
                patente: formData.patente,
                modelo: formData.modelo,
                capacidad_kg: Number(formData.capacidad_kg),
                color: formData.color,
            };

            await CreateFlota(nuevaFlota);
            // Actualizar lista local
            setFlota(prev => [...prev, nuevaFlota]);
            // Cerrar formulario y limpiar datos
            setAbrirFormulario(false);
            setFormData({
                nombre_conductor: "",
                apellido_conductor: "",
                dni_conductor: "",
                empresa: "",
                tipo_unidad: "",
                patente: "",
                modelo: "",
                capacidad_kg: "",
                color: "",
            });
            fetchFlotas();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al crear la unidad");
        } finally {
            setLoading(false);
        }
    };

    async function fetchFlotas() {
            const data = await GetFlotas();
            setListaFlotas(data);
        }

    useEffect(() => {  
        fetchFlotas();
    }, []);

    return (
        <div>
            <Header />
            <div className="text-lg font-bold mb-2 p-4">
                <h1 className="text-2xl font-bold text-center mb-4 text-primary">Gestión de Flotas</h1>
            <button
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
                onClick={() => setAbrirFormulario(true)}
            >
                Agregar Nueva Unidad
            </button>

            <TableFlotas flotas={listaFlotas} />

























        {abrirFormulario && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white p-6 rounded-lg shadow-lg ">
                    <h2 className="text-xl font-bold mb-4">Formulario de Nueva Unidad</h2>
                    <form onSubmit={HandleEnviar}>
                        <div className="grid grid-cols-2 justify-center gap-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                               <input
                                   type="text"
                                   name="nombre_conductor"
                                   value={formData.nombre_conductor}
                                   onChange={handleChange}
                                   required
                                   className="w-full border rounded px-3 py-2"
                                   placeholder="Ingrese el nombre"
                               />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Apellido</label>
                               <input
                                   type="text"
                                   name="apellido_conductor"
                                   value={formData.apellido_conductor}
                                   onChange={handleChange}
                                   required
                                   className="w-full border rounded px-3 py-2"
                                   placeholder="Ingrese el apellido"
                               />
                            </div>
                        </div>
                        <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">DNI del conductor</label>
                                <input
                                    type="text"
                                    name="dni_conductor"
                                    value={formData.dni_conductor}
                                    onChange={handleChange}
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Ingrese el DNI"
                                />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Empresa</label>
                            <input
                                type="text"
                                name="empresa"
                                value={formData.empresa}
                                onChange={handleChange}
                                required
                                className="w-full border rounded px-3 py-2"
                                placeholder="Nombre de empresa"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Tipo de Unidad</label>
                            <select
                                name="tipo_unidad"
                                value={formData.tipo_unidad}
                                onChange={handleChange}
                                required
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">Selecciona un tipo</option>
                                <option value="camion">Camión</option>
                                <option value="camioneta">Camioneta</option>
                                <option value="auto">Auto</option>
                            </select>
                        </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Placa</label>
                                <input
                                    type="text"
                                    name="patente"
                                    value={formData.patente}
                                    onChange={handleChange}
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Ingrese la placa"
                                />
                            </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Modelo</label>
                            <input
                                type="text"
                                name="modelo"
                                value={formData.modelo}
                                onChange={handleChange}
                                required
                                className="w-full border rounded px-3 py-2"
                                placeholder="Ingrese el modelo"
                            />
                        </div>

                        <div className="mb-4 grid grid-cols-2 ">
                            <div className="mb-4 mr-2">
                                <label className="block text-sm font-medium mb-1">Capacidad</label>
                                <input
                                    type="number"
                                    name="capacidad_kg"
                                    value={formData.capacidad_kg}
                                    onChange={handleChange}
                                    required
                                    min={1}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Capacidad en KG"
                                />
                            </div>
                            <div className="mb-4 mr-2">
                                <label className="block text-sm font-medium mb-1">Color</label>
                                <input
                                    type="text"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Ingrese el color"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-4">
                            <button
                                type="submit"
                                className="px-4 py-2 mt-4 bg-success text-white rounded hover:bg-primary-dark transition disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAbrirFormulario(false)}
                                className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                        {error && (
                            <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        )}
        </div>
        </div>
    );
};

export default FlotaPage;   
    