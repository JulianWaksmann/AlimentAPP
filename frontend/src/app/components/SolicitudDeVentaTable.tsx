import React from "react";
import { SolicitudVenta } from "../models/SolicitudVenta";
import { updateEstadoSolicitudVenta } from "../api/pedidosVenta";

type Props = {
  solicitudes: SolicitudVenta[];
};

export default function SolicitudDeVentaTable({ solicitudes }: Props) {
  const handleAccion = (id: number, accion: "confirmada" | "cancelada") => {
    const confirmacion = window.confirm(`Confirmar acción`);
    if (confirmacion) {
      updateEstadoSolicitudVenta(id, accion);

      console.log("ID solicitud:", id, "Acción:", accion);
      // Aquí podrías llamar a una función para actualizar el estado en el backend
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
      <h2 className="text-xl font-bold mb-4 text-primary">
        Solicitudes de Venta
      </h2>
      
      {/* Mobile: Cards */}
      <div className=" mt-6 space-y-4">
        {solicitudes.map((solicitud) => (
          <div
            key={solicitud.id_orden_venta}
            className="rounded-lg border p-3 shadow-sm bg-gray-50"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary">
                Solicitud #{solicitud.id_orden_venta}
              </span>
              {/* Puedes mostrar el estado si lo tienes */}
            </div>
            <div className="mb-1 text-sm font-semibold">Productos:</div>
            <div className="mb-1 text-sm flex flex-col gap-1">
              {Array.isArray(solicitud.productos) ? (
                solicitud.productos.map((prod) => (
                  <span key={prod.id}>
                    {prod.nombre} : {prod.cantidad}
                  </span>
                ))
              ) : (
                <span>
                  {solicitud.productos.nombre} : {solicitud.productos.cantidad}
                </span>
              )}
            </div>
            <div className="mb-1 text-sm">
              <span className="font-semibold">Fecha Pedido:</span>{" "}
              {solicitud.fecha_pedido}
            </div>
            <div className="mb-1 text-sm">
              <span className="font-semibold">Fecha Entrega:</span>{" "}
              {solicitud.fecha_entrega}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="px-2 py-1 bg-green-200 rounded text-xs"
                onClick={() =>
                  handleAccion(solicitud.id_orden_venta, "confirmada")
                }
              >
                Aceptar
              </button>
              <button
                className="px-2 py-1 bg-red-200 rounded text-xs"
                onClick={() =>
                  handleAccion(solicitud.id_orden_venta, "cancelada")
                }
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
