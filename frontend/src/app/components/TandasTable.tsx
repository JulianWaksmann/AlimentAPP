"use client";
import React, { useState, useEffect, useCallback } from "react";
import type { Tanda } from "@/app/models/Tanda"; // ajusta la ruta si tu modelo tiene otro nombre/ruta
import { OrdenProduccion } from "../models/OrdenProduccion";
import { UpdateEstadoTandaProduccion } from "@/app/api/tandas";
import { GetTandas } from "@/app/api/tandas";
// import Modal from "./Modal"; // Asegúrate de tener un componente Modal

type Props = {
  tandas: Tanda[];
  className?: string;
  estado: "planificada" | "en_progreso" | "completada"; // Cambiado a un tipo específico
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString() : "—";

export default function TandasTable({ tandas, className, estado }: Props) {
  const [expandedLineas, setExpandedLineas] = useState<Record<number, boolean>>({});
  const [expandedOrdenes, setExpandedOrdenes] = useState<Record<number, boolean>>({});
  const [loadingLineas, setLoadingLineas] = useState<Record<number, boolean>>({});
  const [localTandas, setLocalTandas] = useState<Tanda[]>(tandas || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [lineaIdToUpdate, setLineaIdToUpdate] = useState<number | null>(null);
  const [tandasSugeridas, setTandas] = useState<Tanda[]>(tandas || []);
  const fechaActual = new Date();

  useEffect(() => {
    setLocalTandas(tandas || []);
  }, [tandas]);

  const toggleLinea = (id: number) =>
    setExpandedLineas((s) => ({ ...s, [id]: !s[id] }));

  const toggleOrden = (id: number) =>
    setExpandedOrdenes((s) => ({ ...s, [id]: !s[id] }));

  const showModal = (title: string, message: string, onConfirm?: () => void) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
    const handleConfirm = () => {
        if (onConfirm) onConfirm(); // Call the callback if provided
        setModalVisible(false);
    };
    // Trigger handleConfirm on user confirmation
    return (
        <div>
            <button onClick={handleConfirm}>Confirm</button>
            <button onClick={() => setModalVisible(false)}>Cancel</button>
        </div>
    );
  };

  const refreshOrderList = () => {
    setLocalTandas(tandas || []);
  };

  const fetchTandas = useCallback(async () => {
    try {
        const response = await GetTandas(estado);
        setTandas(response);
    } catch (error) {
        console.error('Error fetching tandas:', error);
    }
  }, [estado]);

  useEffect(() => {
    fetchTandas();
  }, [fetchTandas]);

  const handleStateChange = async (id: number[], nuevaEstado: string) => {
    try {
        await UpdateEstadoTandaProduccion(id, nuevaEstado);
        fetchTandas(); // Refresh the list after updating
    } catch (error) {
        console.error('Error updating state:', error);
    }
  };

  const handleConfirmAction = async () => {
    if (lineaIdToUpdate === null) return;

    const ordenes = localTandas.find(t => t.id_linea_produccion === lineaIdToUpdate)?.tandas_de_produccion ?? [];
    const ids = Array.from(
      new Set(
        ordenes
          .map((o) => o.id_tanda_produccion)
          .filter((id): id is number => typeof id === "number" && !isNaN(id))
      )
    );

    if (ids.length === 0) {
      showModal("Error", "No se encontraron ids de tanda válidos.");
      return;
    }

    setLoadingLineas((s) => ({ ...s, [lineaIdToUpdate]: true }));

    try {
      await UpdateEstadoTandaProduccion(ids, estado);
      setLocalTandas((prev) =>
        prev.map((t) => {
          if (t.id_linea_produccion !== lineaIdToUpdate) return t;
          const updatedOrdenes = (t.tandas_de_produccion ?? []).map((o) =>
            ids.includes(o.id_tanda_produccion) ? { ...o, estado_tanda_produccion: estado } : o
          );
          return { ...t, tandas_de_produccion: updatedOrdenes };
        })
      );
      showModal("Éxito", "Tandas actualizadas correctamente.", refreshOrderList);
    } catch (err) {
      console.error(err);
      showModal("Error", "Error al actualizar las tandas. Reintenta.");
    } finally {
      setLoadingLineas((s) => ({ ...s, [lineaIdToUpdate]: false }));
      setLineaIdToUpdate(null);
    }
  };

  const handleButtonClick = (lineaId: number, ordenes: OrdenProduccion[]) => {
    const estadoOrden = ordenes[0]?.estado_tanda_produccion;
    const action = estadoOrden === "planificada" ? "Poner en producción" : "Finalizar Tanda";
    const message = `¿Seguro que querés ${action.toLowerCase()} todas las órdenes de esta línea?`;

    setLineaIdToUpdate(lineaId);
    showModal("Confirmación", message);
  };

  if (!localTandas || localTandas.length === 0) {
    return <div className="p-4 text-center text-sm text-gray-500">No hay tandas para mostrar</div>;
  }

  return (
    <div className={`space-y-4 p-4 ${className ?? ""}`}>
      {localTandas.map((tanda, idx) => {
        const lineaId = tanda.id_linea_produccion ?? idx;
        const ordenes = tanda.tandas_de_produccion ?? [];

        return (
          <article
            key={lineaId}
            className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200"
          >
            <header className="flex items-center justify-between p-3 sm:p-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Línea de Producción #{lineaId}{" "}
                </h3>
                {tanda.nombre_linea_produccion ? <span className="text-sm text-gray-500">· {tanda.nombre_linea_produccion}</span> : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLinea(lineaId)}
                  aria-expanded={!!expandedLineas[lineaId]}
                  className="text-sm px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {expandedLineas[lineaId] ? "Ocultar" : "Ver"}
                </button>

                <button
                  onClick={() => handleButtonClick(lineaId, ordenes)}
                  disabled={!!loadingLineas[lineaId]}
                  className="text-sm px-3 py-1 rounded-md bg-amber-600 text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loadingLineas[lineaId] ? "Enviando..." : (ordenes[0]?.estado_tanda_produccion === "planificada" ? "Poner en producción" : "Finalizar Tanda")}
                </button>
              </div>
            </header>

            {expandedLineas[lineaId] && (
              <div className="divide-y">
                {ordenes.map((orden: OrdenProduccion) => {
                  const ordenKey = orden.id_orden_produccion ?? Math.random();
                  return (
                    <div key={ordenKey} className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {orden.nombre_producto ?? `Producto #${orden.id_producto ?? "—"}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Cliente: {orden.nombre_cliente ?? "—"} {orden.apellido_cliente ?? ""}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">{orden.cantidad_kg_tanda ?? "—"} kg</p>
                              <p className="text-xs text-gray-500">Sec: {orden.secuencia_en_linea ?? "—"}</p>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <div>Fecha creación de orden de producción: {formatDate(orden.fecha_creacion_orden_produccion)}</div>
                            <div>Fecha de entrega solicitada: {formatDate(orden.fecha_entrega_solicitada_orden_venta)}</div>
                            <div className="mt-1">
                              Estado tanda:{" "} 
                              <span className={`font-medium ${ fechaActual > new Date(orden.fecha_entrega_solicitada_orden_venta ?? "") ? "text-red-600" : "text-green-600"}`}>
                                { fechaActual > new Date(orden.fecha_entrega_solicitada_orden_venta ?? "") ? "Retrasada" : "A tiempo" }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => toggleOrden(ordenKey)}
                          className="text-sm px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          {expandedOrdenes[ordenKey] ? "Ocultar detalle" : "Ver detalle"}
                        </button>
                      </div>

                      {expandedOrdenes[ordenKey] && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <strong>Id Orden:</strong> {orden.id_orden_produccion}
                            </div>
                            <div>
                              <strong>Cantidad producto:</strong> {orden.cantidad_producto ?? "—"} bultos
                            </div>
                            <div>
                              <strong>Fecha entrega solicitada:</strong> {formatDate(orden.fecha_entrega_solicitada_orden_venta)}
                            </div>
                          </div>

                          {/* Materias primas */}
                          <div className="mt-3">
                            <details className="bg-white border rounded-md">
                              <summary className="px-3 py-2 cursor-pointer flex items-center justify-between">
                                <span className="text-sm font-medium">Materias primas requeridas</span>
                                <span className="text-xs text-gray-500">{(orden.materias_primas_requeridas?.length ?? 0)} items</span>
                              </summary>

                              <div className="p-3 space-y-2">
                                {(orden.materias_primas_requeridas ?? []).map((mp) => (
                                  <div key={mp.id_lote_materia_prima ?? mp.codigo_lote} className="flex items-center justify-between text-sm">
                                    <div>
                                      <div className="font-medium">{mp.nombre_materia_prima}</div>
                                      <div className="text-xs text-gray-500">{mp.codigo_lote}</div>
                                    </div>
                                    <div className="text-right text-sm text-gray-700">
                                      {mp.cantidad_materia_prima} {mp.unidad_medida_materia_prima ?? ""}
                                    </div>
                                  </div>
                                ))}

                                {(!orden.materias_primas_requeridas || orden.materias_primas_requeridas.length === 0) && (
                                  <div className="text-xs text-gray-500">No hay materias primas asignadas</div>
                                )}
                              </div>
                            </details>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {ordenes.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">No hay órdenes en esta tanda</div>
                )}
              </div>
            )}
          </article>
        );
      })}

      {/* Modal para confirmaciones y mensajes */}
      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={modalTitle}>
        <p>{modalMessage}</p>
        <button onClick={handleConfirmAction} className="mt-4 px-4 py-2 bg-green-600 text-white rounded">
          Confirmar
        </button>
      </Modal>
    </div>
  );
}

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div>{children}</div>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Cerrar
        </button>
      </div>
    </div>
  );
};
