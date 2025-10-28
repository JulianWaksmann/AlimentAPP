import React, { useState } from "react";
import { SolicitudVenta } from "../models/SolicitudVenta";
import { updateEstadoSolicitudVenta } from "../api/pedidosVenta";

type Props = {
  solicitudes: SolicitudVenta[];
};

export default function SolicitudDeVentaTable({ solicitudes }: Props) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    id: number;
    accion: "confirmada" | "cancelada";
  } | null>(null);

  const handleAccion = (id: number, accion: "confirmada" | "cancelada") => {
    // Abrir modal de confirmación en lugar de window.confirm
    setPendingAction({ id, accion });
    setConfirmVisible(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { id, accion } = pendingAction;
    try {
      await updateEstadoSolicitudVenta(id, accion);
      // recargar para simplificar la actualización de la vista (como antes)
      window.location.reload();
    } catch (error) {
      console.error("Error actualizando solicitud:", error);
    } finally {
      setConfirmVisible(false);
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setConfirmVisible(false);
    setPendingAction(null);
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
      <h2 className="text-xl font-bold mb-4 text-primary">
        Solicitudes de Venta
      </h2>
      
      {/* Mobile: Cards */}
      {solicitudes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4">No hay pedidos en espera de materia prima.</td>
              </tr>
            ) : (
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
            <div>
              <span className="font-semibold">Cliente:</span>{" "}
              {solicitud.nombre_contacto} {solicitud.apellido_contacto}
            </div>
            <div><span className="font-semibold">Valor del pedido:</span> ${solicitud.valor_total_pedido}</div>
            <div>
              <span className="font-semibold">Razón Social:</span>{" "}
              {solicitud.razon_social}
            </div>
            <div className="mb-1 font-semibold">Productos:</div>
            <div className="mb-1 text-sm flex flex-col gap-1">
              {Array.isArray(solicitud.productos) ? (
                solicitud.productos.map((prod) => (
                  <span key={prod.id}>
                    {prod.nombre} - cantidad: {prod.cantidad}
                  </span>
                ))
              ) : (
                <span>
                  {solicitud.productos.nombre} : {solicitud.productos.cantidad}
                </span>
              )}
            </div>
            <div> <span className="font-semibold">contacto: </span>{solicitud.telefono} - {solicitud.email}</div>

            <div className="mb-1 text-sm">
              <span className="font-semibold">Fecha Pedido:</span>{" "}
              {solicitud.fecha_pedido}
            </div>
            <div className="mb-1 text-sm">
              <span className="font-semibold">Fecha Entrega Solicitada:</span>{" "}
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
      )}

      {confirmVisible && pendingAction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Confirmación</h2>
            <p className="text-sm">
              ¿Desea {pendingAction.accion === "confirmada" ? "aceptar" : "rechazar"} la solicitud #{pendingAction.id}?
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={confirmAction} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md">Sí, confirmar</button>
              <button onClick={cancelAction} className="px-4 py-2 bg-gray-100 rounded-md">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
