"use client";
import Header from "@/app/components/Header";
import { Flota } from "@/app/models/Flota";
import { PedidosTerminados } from "@/app/models/PedidosVentas";
import React, { useEffect, useState } from "react";
import { GetFlotas, crearEnvio } from "@/app/api/logistica"; // Asegúrate de que crearEnvio esté importado
import { getPedidosTerminados } from "@/app/api/pedidosVenta";
 
// const ZONAS = ["zona norte", "zona sur", "zona este", "zona oeste"];

const EnviosPage = () => {

    const [pedidos, setPedidos] = useState<PedidosTerminados[]>([]); // Renombrado ListaEnvios a pedidos para mayor claridad
    const [loading, setLoading] = useState(true); // Inicialmente en true para mostrar carga al inicio
    const [flotas, setFlotas] = useState<Flota[]>([]);

    // Estados para la lógica de asignación
    const [selectedFlotaId, setSelectedFlotaId] = useState<number | null>(null);
    // const [selectedZona, setSelectedZona] = useState<string>("");
    const [pedidosSeleccionados, setPedidosSeleccionados] = useState<Record<number, boolean>>({});
    
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isResultModalOpen, setResultModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: "", message: "", isError: false });
    const [isSubmitting, setSubmitting] = useState(false);

    // Función para cargar datos iniciales y refrescar
    const fetchData = async () => {
        setLoading(true);
        try {
            const pedidosResponse = await getPedidosTerminados();
            // const allPedidos: PedidosTerminados[] = pedidosPorZonaResponse.flatMap(zona =>
            //     zona.ordenes_venta.map(orden => ({
            //         id_pedido_venta: orden.id_orden_venta,
            //         id_cliente: orden.id_cliente,
            //         razon_social: orden.razon_social,
            //         email: orden.email,
            //         nombre_contacto: orden.nombre_contacto,
            //         apellido_contacto: orden.apellido_contacto,
            //         telefono: orden.telefono,
            //         productos: orden.productos,
            //         fecha_pedido: orden.fecha_pedido,
            //         fecha_entrega_solicitada: orden.fecha_entrega_solicitada,
            //         valor_total_pedido: orden.valor_total_pedido,
            //         peso_total_kg: orden.peso_total_pedido,
            //         direccion_text: orden.direccion_entrega,
            //         // zona: zona.zona,
            //     }))
            // );
            setPedidos(pedidosResponse);

            const flotasResponse = await GetFlotas();
            setFlotas(flotasResponse);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            setModalContent({ title: "Error", message: "No se pudieron cargar los datos. Intente de nuevo.", isError: true });
            setResultModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const vehiculoSeleccionado = React.useMemo(() => {
        return flotas.find((f) => f.id === selectedFlotaId) || null;
    }, [selectedFlotaId, flotas]);

    const pedidosFiltrados = React.useMemo(() => {
        // Ya no filtramos por zona: mostramos todos los pedidos terminados
        return pedidos;
    }, [pedidos]);

    const pesoTotalSeleccionado = React.useMemo(() => {
        return pedidosFiltrados.reduce((acc, pedido) => {
            if (pedidosSeleccionados[pedido.id_pedido_venta]) {
                const peso = Number(pedido.peso_total_kg) || 0;
                return acc + peso;
                // return acc + (pedido.peso_total_kg || 0);
            }
            return acc;
        }, 0);
        

    }, [pedidosSeleccionados, pedidosFiltrados]);

    const capacidadRestante = vehiculoSeleccionado
        ? (Number(vehiculoSeleccionado.capacidad_kg ) || 0)  -  pesoTotalSeleccionado
        : 0;

    const handleSelectPedido = (pedidoId: number, peso: number) => {
        if (!vehiculoSeleccionado) {
            setModalContent({ title: "Error", message: "Primero debe seleccionar un vehículo.", isError: true });
            setResultModalOpen(true);
            return;
        }

        const isSelected = !!pedidosSeleccionados[pedidoId];
        if (!isSelected && pesoTotalSeleccionado + peso > vehiculoSeleccionado.capacidad_kg) {
            setModalContent({ title: "Capacidad Excedida", message: "No se puede agregar este pedido, excede la capacidad del vehículo.", isError: true });
            setResultModalOpen(true);
            return;
        }

        setPedidosSeleccionados(prev => ({
            ...prev,
            [pedidoId]: !isSelected,
        }));
    };

    const resetState = () => {
        setSelectedFlotaId(null);
        setPedidosSeleccionados({});
    };

    const handleFinalizarAsignacion = () => {
        if (!vehiculoSeleccionado || Object.keys(pedidosSeleccionados).filter(k => pedidosSeleccionados[Number(k)]).length === 0) {
            setModalContent({ title: "Datos incompletos", message: "Debe seleccionar un vehículo y al menos un pedido.", isError: true });
            setResultModalOpen(true);
            return;
        }
        setConfirmModalOpen(true);
    };

    const handleConfirmarEnvio = async () => {
        if (!vehiculoSeleccionado) return;
        
        setSubmitting(true);
        setConfirmModalOpen(false);

        const idsPedidosSeleccionados = Object.keys(pedidosSeleccionados)
            .filter(id => pedidosSeleccionados[Number(id)] === true)
            .map(Number);

            console.log("Asignando envío con datos:", {
                id_vehiculo: vehiculoSeleccionado.id,
                ids_pedidos: idsPedidosSeleccionados,
            });
        try {
            
            await crearEnvio({
                id_vehiculo: vehiculoSeleccionado.id,
                ids_pedidos: idsPedidosSeleccionados,
            });
            setModalContent({ title: "Éxito", message: "El envío se ha asignado correctamente.", isError: false });
            resetState();
            await fetchData(); // Refrescar datos después de una asignación exitosa
        } catch (error) {
            console.error("Error al crear envío:", error);
            setModalContent({ title: "Error", message: "Hubo un problema al asignar el envío. Por favor, intente de nuevo.", isError: true });
        } finally {
            setSubmitting(false);
            setResultModalOpen(true);
        }
    };

    const pedidosParaConfirmacion = React.useMemo(() => {
        return pedidos.filter(p => pedidosSeleccionados[p.id_pedido_venta]);
    }, [pedidos, pedidosSeleccionados]);
    
    return (
        <div>
            <Header />
            <div className="p-4 space-y-6">
                <h1 className="text-2xl font-bold mb-4 text-center">Gestión de Envíos</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="flota" className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Flota</label>
                        <select id="flota" value={selectedFlotaId ?? ""} onChange={(e) => { setSelectedFlotaId(Number(e.target.value)); setPedidosSeleccionados({}); }} className="w-full p-2 border rounded-md bg-white shadow-sm">
                            <option value="" disabled>-- Seleccione un vehículo --</option>
                            {flotas.map(f => <option key={f.id} value={f.id}>{f.nombre_conductor} - {f.modelo} (Cap: {f.capacidad_kg} kg)</option>)}
                        </select>
                    </div>
                    {/* <div>
                        <label htmlFor="zona" className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Zona</label>
                        <select id="zona" value={selectedZona} onChange={(e) => { setSelectedZona(e.target.value); setPedidosSeleccionados({}); }} className="w-full p-2 border rounded-md bg-white shadow-sm">
                            <option value="" disabled>-- Seleccione una zona --</option>
                            {ZONAS.map(z => <option key={z} value={z}>{z.charAt(0).toUpperCase() + z.slice(1)}</option>)}
                        </select>
                    </div> */}
                </div>

                {vehiculoSeleccionado && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                        <p><strong>Vehículo:</strong> {vehiculoSeleccionado.modelo}</p>
                        <p><strong>Capacidad Total:</strong> {vehiculoSeleccionado.capacidad_kg} kg</p>
                        <p><strong>Peso Seleccionado:</strong> {pesoTotalSeleccionado.toFixed(2)} kg</p>
                        <p className={`font-bold ${capacidadRestante < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            <strong>Capacidad Restante:</strong> {capacidadRestante.toFixed(2)} kg
                        </p>
                    </div>
                )}

                {loading ? <p className="text-center text-gray-500">Cargando pedidos...</p> :
                    <div className="space-y-3">
                        {/* <h3 className="text-lg font-semibold">Pedidos para {selectedZona || '...'}</h3> */}
                        {pedidosFiltrados.length > 0 ? (
                            pedidosFiltrados.map(pedido => {
                                const isChecked = !!pedidosSeleccionados[pedido.id_pedido_venta];
                                const pesoPedido = Number(pedido.peso_total_kg) || 0;

                                return (
                                    <div key={pedido.id_pedido_venta} className={`p-3 rounded-lg shadow-sm border flex items-start gap-4 ${!isChecked && capacidadRestante < (pedido.peso_total_kg || 0) ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                                        {/* <input type="checkbox" checked={isChecked} onChange={() => handleSelectPedido(pedido.id_pedido_venta, pedido.peso_total_kg || 0)} disabled={!isChecked && capacidadRestante < (pedido.peso_total_kg || 0)} className="mt-1 h-5 w-5" /> */}
                                       <input type="checkbox" checked={isChecked} onChange={() => handleSelectPedido(pedido.id_pedido_venta, pesoPedido)} disabled={!isChecked && capacidadRestante < pesoPedido} className="mt-1 h-5 w-5" />

                                        <div className="flex-grow">
                                            <p className="font-bold">Pedido #{pedido.id_pedido_venta} - {pedido.razon_social}</p>
                                            <p className="text-sm text-gray-600">{pedido.direccion_text}</p>
                                            <p className="text-sm"><strong>Peso:</strong> {pesoPedido} kg</p>

                                            {/* <p className="text-sm"><strong>Peso:</strong> {pedido.peso_total_kg || 0} kg</p> */}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-gray-500 py-4">No hay pedidos disponibles.</p>
                        )}
                    </div>
                }

                <button onClick={handleFinalizarAsignacion} disabled={isSubmitting || !vehiculoSeleccionado || Object.keys(pedidosSeleccionados).filter(k => pedidosSeleccionados[Number(k)]).length === 0} className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-opacity disabled:opacity-50">
                    {isSubmitting ? "Procesando..." : "Finalizar Asignación"}
                </button>

                {/* Modal de Confirmación */}
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">Confirmar Asignación</h3>
                            <div className="text-sm space-y-2 mb-6">
                                <p><strong>Vehículo:</strong> {vehiculoSeleccionado?.modelo}</p>
                                <p><strong>Peso Total:</strong> {pesoTotalSeleccionado.toFixed(2)} kg</p>
                                <p className="font-bold">Pedidos a asignar ({pedidosParaConfirmacion.length}):</p>
                                <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                                    {pedidosParaConfirmacion.map(p => <li key={p.id_pedido_venta}>#{p.id_pedido_venta} - {p.razon_social}</li>)}
                                </ul>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-200">Cancelar</button>
                                <button onClick={handleConfirmarEnvio} className="px-4 py-2 rounded-md bg-green-600 text-white">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Resultado */}
                {isResultModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                        <div className={`bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center border-t-4 ${modalContent.isError ? 'border-red-500' : 'border-green-500'}`}>
                            <h3 className="text-xl font-bold mb-4">{modalContent.title}</h3>
                            <p className="mb-6">{modalContent.message}</p>
                            <button onClick={() => setResultModalOpen(false)} className={`w-full px-4 py-2 rounded-md text-white ${modalContent.isError ? 'bg-red-600' : 'bg-green-600'}`}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnviosPage;
    