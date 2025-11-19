"use client";
import React, { useMemo, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {OrdenDetalle} from "../models/OrdenProduccion";
import { getOrdenProduccionDetails } from "../api/produccion";
import { actualizarFechaOrden } from "../api/produccion";
import timeGridPlugin from "@fullcalendar/timegrid";


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

    // Nuevo: estado para buscador y resaltado
    const [searchId, setSearchId] = useState<string>("");
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const calendarRef = useRef<FullCalendar | null>(null);

    const events = useMemo(() => {
        if (!planificacion) return [];
        return Object.entries(planificacion).flatMap(([fecha, lista]) =>
            lista.map((o) => ({
                id: String(o.id_orden_produccion),
                title: `#${o.id_orden_produccion}`,
                start: fecha,
                borderColor: estadoColor[o.estado_pedido],
                extendedProps: { estado: o.estado_pedido },
            }))
        );
    }, [planificacion]);
        

    async function actualizarFecha(id: number, fecha: string) {
        // console.log("Actualizando fecha para orden:", id, "a nueva fecha:", fecha);
        try{
            const response = await actualizarFechaOrden(id, fecha);
            console.log("Fecha actualizada:", response);
            window.location.reload();
        }
        catch(error){
            console.error("Error al actualizar la fecha:", error);
        }
        }

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
        const id = String(eventInfo.event.id);
        const isSelected = selectedEventId === id;
        return (
            <div
                className={`bg-gray-200 p-0.5 border flex flex-col items-center justify-center hover:cursor-pointer ${
                    isSelected ? "border-2 border-blue-600 ring-2 ring-blue-300" : "border-gray-200"
                }`}
                style={{ borderColor: isSelected ? undefined : eventInfo.event.borderColor as string }}
            >
                <div className="text-xs">
                    {eventInfo.event.extendedProps.estado === "atrasado"
                        ? "🟡"
                        : eventInfo.event.extendedProps.estado === "en_tiempo"
                        ? "🟢"
                        : "🔴"}
                </div>
                <div
                    className="text-xs"
                    style={{ color: "black" }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleVerMas(Number(id));
                    }}
                >
                    {eventInfo.event.title}
                </div>
            </div>
        );
    };

    // Nuevo: buscar por ID, navegar y resaltar
    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const id = searchId.trim();
        if (!id) return;

        const api = calendarRef.current?.getApi();
        const ev = api?.getEventById(id);
        if (ev && ev.start) {
            setSelectedEventId(id);
            api?.gotoDate(ev.start);
            // Opcional: abrir modal con detalles
            // fetchOrderDetails(Number(id));
        } else {
            setSelectedEventId(null);
            alert("Orden no encontrada en el calendario.");
        }
    }

    function clearSearch() {
        setSearchId("");
        setSelectedEventId(null);
    }

    return (
        <div>
            {/* Buscador de orden por ID */}
            {/* <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
                <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="Buscar Orden #"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="w-40 rounded border px-3 py-2"
                />
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">
                    Buscar
                </button>
                <button type="button" onClick={clearSearch} className="px-3 py-2 border rounded">
                    Limpiar
                </button>
            </form> */}

            <FullCalendar
                ref={calendarRef}
                dayHeaderFormat={{ weekday: "short" }}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: "prev,next today", right: "title" }}
                defaultAllDayEventDuration={"24:00"}
                events={events}
                eventContent={renderEventContent}
                weekends={false}
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
                                className="px-4 py-2 mx-1 bg-success text-white rounded"
                            >
                                Cerrar
                            </button>
                            <button 
                                onClick={() => {setModalAdvertencia(true)}}
                               className="px-4 mx-1 py-2 bg-error text-white rounded">
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
                               <p className="text-gray-600 text-xs">la fecha debe ser mayor a la fecha solicitada del pedido</p>
                               <div>
                                    <input id="fechaEntrega" required type="date" min={selectedOrder?.fecha_entrega_solicitada ? new Date(selectedOrder.fecha_entrega_solicitada).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full rounded border px-3 py-2" />
                                </div>  
                               
                               <div className="flex justify-end mt-4">
                                   <button
                                       onClick={() => {setModalAdvertencia(false); setFechaEntrega("")}}
                                       className="px-4 py-2 mx-1 bg-gray-300 text-black rounded"
                                   >
                                       Cancelar
                                   </button>
                                   <button
                                   type="submit"
                                       disabled={!fechaEntrega || (selectedOrder?.fecha_entrega_solicitada ? fechaEntrega > new Date(selectedOrder.fecha_entrega_solicitada).toISOString().split("T")[0] : fechaEntrega > new Date().toISOString().split("T")[0])}
                                       onClick={() => {
                                           // Lógica para replanificar la orden
                                           actualizarFecha(selectedOrder!.id_orden_venta, fechaEntrega);
                                           setModalAdvertencia(false);
                                           setModalOpen(false);
                                       }}
                                       className="px-4 py-2 mx-1 bg-error text-white rounded"
                                   >
                                       Replanificar
                                   </button>
                                </div>
                         </div>
                       </div>
                   )}
        </div>);
}
