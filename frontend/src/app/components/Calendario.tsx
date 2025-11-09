"use client";
import React, { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {OrdenDetalle} from "../models/OrdenProduccion";
import { getOrdenProduccionDetails } from "../api/produccion";



type OrdenPlanificada = {
    estado_pedido: "atrasado" | "en_tiempo" | "por_vencer";
    id_orden_produccion: number;
};

// Recibe un objeto donde la clave es la fecha (YYYY-MM-DD) y el valor es el array de órdenes
type PlanificacionMap = Record<string, OrdenPlanificada[]>;

type Props = {
    planificacion: PlanificacionMap;
};

const estadoColor: Record<OrdenPlanificada['estado_pedido'], string> = {
    atrasado: "#FFA500", // naranja
    en_tiempo: "#16A34A", // verde
    por_vencer: "#DC2626", // rojo
};

export default function Calendario({ planificacion }: Props) {
    
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<OrdenDetalle | null>(null);
    const [modalAdvertencia, setModalAdvertencia] = useState(false);
    const [fechaEntrega, setFechaEntrega] = useState<string>("");

    const events = useMemo(() => {
        if (!planificacion) return [];
        return Object.entries(planificacion).flatMap(([fecha, lista]) =>
            lista.map((o) => ({
                id: String(o.id_orden_produccion),
                title: `#${o.id_orden_produccion}`,
                start: fecha,
                backgroundColor: estadoColor[o.estado_pedido],
                borderColor: estadoColor[o.estado_pedido],
                extendedProps: { estado: o.estado_pedido },
            }))
        );
    }, [planificacion]);
        
    async function fetchOrderDetails(id: number) {
        try{
            const response = await getOrdenProduccionDetails(id);
            setSelectedOrder(response);
            console.log("Detalles de la orden de produccion:", response);
            setModalOpen(true);
        }
        
        catch(error){
            console.error("Error fetching order details:", error);
        }
        }

        const handleVerMas = (id: number) => {
        try{
        fetchOrderDetails(id);
        }
        catch(error){
            console.error("Error fetching order details:", error);
        }
        }



    const renderEventContent = (eventInfo: EventContentArg) => {
        const id = Number(eventInfo.event.id);
        return (
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium" style={{ color: "white" }}>
                    {eventInfo.event.title}
                </div>
                <button
                    onClick={(e) => {
                        // evitar que FullCalendar haga navegación de evento
                        e.stopPropagation();
                        handleVerMas(id);
                    }}
                    className="ml-2 text-[10px] bg-white text-black rounded px-1 py-0.5"
                >
                    ver más
                </button>
            </div>
        );
    };

    return (
        <div>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                eventContent={renderEventContent}
                height="auto"
                dayMaxEventRows={true}
            />

            {modalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-1">Orden de Producción #{selectedOrder.id}</h2>
                        <p className="text-sm text-gray-500 mb-4">Pedido de Venta #{selectedOrder.id_orden_venta}</p>
                        
                        <div className="space-y-2 text-sm">
                            <p><strong>Cliente:</strong> {selectedOrder.cliente}</p>
                            <p><strong>Producto:</strong> {selectedOrder.nombre_producto}</p>
                            <p><strong>Cantidad:</strong> {selectedOrder.cantidad} bultos</p>
                            <p><strong>Fecha de Entrega Solicitada:</strong> {new Date(selectedOrder.fecha_entrega_solicitada).toLocaleDateString()} </p>
                            
                            <details className="pt-2">
                                <summary className="cursor-pointer font-semibold">Materias Primas Requeridas</summary>
                                <ul className="list-disc pl-5 mt-2 text-xs text-gray-700">
                                    {selectedOrder.materias_primas &&
                                    selectedOrder.materias_primas.map(mp => (
                                        <li key={mp.id}>{mp.nombre_materia_prima}: {mp.cantidad_utilizada} {mp.unidad_medida}</li>
                                    ))}
                                </ul>
                            </details>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 mx-1 bg-blue-600 text-white rounded"
                            >
                                Cerrar
                            </button>
                            <button 
                                onClick={() => {setModalAdvertencia(true)}}
                               className="px-4 mx-1 py-2 bg-red-600 text-white rounded">
                                Replanificar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalAdvertencia && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                               <h2 className="text-xl font-bold mb-4">Advertencia</h2>
                               <p className="mb-4">Seleccione la nueva fecha de entrega para la Orden #{selectedOrder?.id}?</p>
                               <div>
                                    <input id="fechaEntrega" required type="date" min={selectedOrder?.fecha_entrega_solicitada ? new Date(selectedOrder.fecha_entrega_solicitada).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full rounded border px-3 py-2" />
                                </div>  
                               
                               <div className="flex justify-end mt-4">
                                   <button
                                       onClick={() => setModalAdvertencia(false)}
                                       className="px-4 py-2 mx-1 bg-gray-300 text-black rounded"
                                   >
                                       Cancelar
                                   </button>
                                   <button
                                   type="submit"
                                       onClick={() => {
                                           // Lógica para replanificar la orden
                                           setModalAdvertencia(false);
                                           setModalOpen(false);
                                       }}
                                       className="px-4 py-2 mx-1 bg-red-600 text-white rounded"
                                   >
                                       Replanificar
                                   </button>
                                </div>
                         </div>
                       </div>
                   )}
        </div>);
}
