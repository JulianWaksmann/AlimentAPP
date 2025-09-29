
import React from "react";
import { SolicitudVenta } from "../models/SolicitudVenta";
import { updateEstadoSolicitudVenta } from "../api/pedidosVenta";

type Props = {
  solicitudes: SolicitudVenta[];
};

export default function SolicitudDeVentaTable({ solicitudes }: Props) {
  const handleAccion = (id: number, accion: "confirmada" | "cancelada") => {
    const confirmacion = window.confirm(
      `Confirmar acción`
    );
    if (confirmacion) {
          updateEstadoSolicitudVenta(id , accion);

      console.log("ID solicitud:", id, "Acción:", accion);
      // Aquí podrías llamar a una función para actualizar el estado en el backend
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
      <h2 className="text-xl font-bold mb-4 text-primary">Solicitudes de Venta</h2>
      {/* Tabla desktop */}
      <table className="min-w-full divide-y divide-gray-200 hidden md:table">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">ID Solicitud</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Producto</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Cantidad</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Fecha Pedido</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Fecha Entrega</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.id} className="hover:bg-gray-100 transition">
              <td className="px-2 py-2 text-sm">{solicitud.id}</td>
              <td className="px-2 py-2 text-sm">{solicitud.nombre}</td>
              <td className="px-2 py-2 text-sm">{solicitud.cantidad}</td>

              <td className="px-2 py-2 text-sm">{solicitud.fecha_pedido}</td>
              <td className="px-2 py-2 text-sm">{solicitud.fecha_entrega_solicitada}</td>

              <td className="px-2 py-2 text-sm">
                <button
                  className="px-2 py-1 bg-green-200 rounded text-xs mr-2"
                  onClick={() => handleAccion(solicitud.id_orden_venta, "confirmada")}
                >
                  Aceptar
                </button>
                <button
                  className="px-2 py-1 bg-red-200 rounded text-xs"
                  onClick={() => handleAccion(solicitud.id_orden_venta, "cancelada")}
                >
                  Rechazar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Mobile: Cards */}
      <div className="md:hidden mt-6 space-y-4">
        {solicitudes.map((solicitud) => (
          <div key={solicitud.id} className="rounded-lg border p-3 shadow-sm bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary">Solicitud #{solicitud.id}</span>
              <span className="text-xs font-semibold">Pendiente</span>
            </div>
            <div className="mb-1 text-sm"><span className="font-semibold">Producto</span> {solicitud.nombre}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Cantidad:</span> {solicitud.cantidad}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Pedido:</span> {solicitud.fecha_pedido}</div>
            <div className="mb-1 text-sm"><span className="font-semibold">Fecha Entrega:</span> {solicitud.fecha_entrega_solicitada}</div>
            <div className="mt-2 flex gap-2">
              <button
                className="px-2 py-1 bg-green-200 rounded text-xs"
                onClick={() => handleAccion(solicitud.id_orden_venta, "confirmada")}
              >
                Aceptar
              </button>
              <button
                className="px-2 py-1 bg-red-200 rounded text-xs"
                onClick={() => handleAccion(solicitud.id_orden_venta, "cancelada")}
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