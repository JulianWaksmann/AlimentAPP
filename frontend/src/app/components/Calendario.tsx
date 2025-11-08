"use client";
import React, { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

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
    const [selectedOrder, setSelectedOrder] = useState<{
        id: number;
        estado: OrdenPlanificada['estado_pedido'];
        fecha: string;
    } | null>(null);

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

    const handleVerMas = (id: number, estado: OrdenPlanificada['estado_pedido'], fecha: string) => {
        setSelectedOrder({ id, estado, fecha });
        setModalOpen(true);
    };

    const renderEventContent = (eventInfo: EventContentArg) => {
        const id = Number(eventInfo.event.id);
        const estado = eventInfo.event.extendedProps.estado as OrdenPlanificada['estado_pedido'];
        const fecha = eventInfo.event.startStr;
        return (
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium" style={{ color: "white" }}>
                    {eventInfo.event.title}
                </div>
                <button
                    onClick={(e) => {
                        // evitar que FullCalendar haga navegación de evento
                        e.stopPropagation();
                        handleVerMas(id, estado, fecha);
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
                        <h3 className="text-lg font-semibold mb-2">Orden #{selectedOrder.id}</h3>
                        <p className="text-sm text-gray-700">Estado: {selectedOrder.estado}</p>
                        <p className="text-sm text-gray-700">Fecha: {selectedOrder.fecha}</p>
                        {/* Modal vacío por ahora — aquí iría más información */}
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}