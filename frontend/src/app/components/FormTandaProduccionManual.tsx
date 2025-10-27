"use client";
import React, { useEffect, useMemo, useState } from "react";
// import Modal from "./Modal";
import { GetGenerarTanda, CrearTandaProduccionManual } from "@/app/api/tandas";
import type { TandaProduccionManual } from "@/app/models/Tanda";
import type { OrdenProduccion } from "@/app/models/OrdenProduccion";

type Props = {
  lineas?: TandaProduccionManual[]; // opcional: si no se pasa, el componente hace fetch
  onUpdated?: () => void; // callback para refrescar vista padre
};

export default function GenerarTandaForm({ lineas: initialLineas, onUpdated }: Props) {
  const [lineas, setLineas] = useState<TandaProduccionManual[]>(initialLineas ?? []);
  const [selectedLineaId, setSelectedLineaId] = useState<number | null>(initialLineas?.[0]?.id_linea_produccion ?? null);
  const [checkedOrders, setCheckedOrders] = useState<Record<number, boolean>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [msgModal, setMsgModal] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // fetch fallback si no recibimos lineas por prop
  useEffect(() => {
    if (initialLineas && initialLineas.length) return;
    let mounted = true;
    (async () => {
      try {
        const res = await GetGenerarTanda();
        if (!mounted) return;
        setLineas(res);
        if (res.length) setSelectedLineaId(res[0].id_linea_produccion);
      } catch (error) {
        console.error(error);
        setMsgModal({ title: "Error", body: "No se pudieron cargar las líneas. Reintenta." });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initialLineas]);

  // linea seleccionada
  const lineaSeleccionada = useMemo(
    () => lineas.find((l) => l.id_linea_produccion === selectedLineaId) ?? null,
    [lineas, selectedLineaId]
  );

  // total kg seleccionado
  const totalKg = useMemo(() => {
    if (!lineaSeleccionada) return 0;
    const orders = lineaSeleccionada.ordenes_de_produccion_aceptadas ?? [];
    return orders.reduce((acc, o) => (checkedOrders[o.id_orden_produccion] ? acc + (Number(o.cantidad_kg_orden_produccion) || 0) : acc), 0);
  }, [checkedOrders, lineaSeleccionada]);

  const capacidadMax = lineaSeleccionada ? Number(lineaSeleccionada.capacidad_linea_produccion) || 0 : 0;
  const restante = Math.max(0, capacidadMax - totalKg);

  // toggle checkbox
  const toggleCheck = (orderId: number, kg: number) => {
    const currently = !!checkedOrders[orderId];
    // si actualmente no está marcado y añadirlo excede, bloquear
    if (!currently && totalKg + kg > capacidadMax) {
      setMsgModal({ title: "Capacidad excedida", body: "No podés seleccionar esa orden: superaría la capacidad máxima de la línea." });
      return;
    }
    setCheckedOrders((s) => ({ ...s, [orderId]: !currently }));
  };

  // (se construirá el payload con id_linea_produccion y ordenes_produccion al confirmar)

  // abrir modal de confirmación
  const handleGenerateClick = () => {
    const selectedCount = Object.values(checkedOrders).filter(Boolean).length;
    if (!selectedCount) {
      setMsgModal({ title: "Selección vacía", body: "Debés seleccionar al menos una orden para generar la tanda." });
      return;
    }
    if (totalKg < 1) {
      setMsgModal({ title: "Kg inválidos", body: "La cantidad total seleccionada debe ser mayor a 0 kg." });
      return;
    }

    // mensaje de confirmación pedido por el usuario
    setConfirmVisible(true);
  };

  // confirmar y llamar API
  const confirmGenerate = async () => {
    setConfirmVisible(false);
    // construir payload con la línea seleccionada y las órdenes (id + kg)
    if (!lineaSeleccionada || selectedLineaId === null) {
      setMsgModal({ title: "Error", body: "No hay línea seleccionada." });
      return;
    }

    const selectedOrders = (lineaSeleccionada.ordenes_de_produccion_aceptadas ?? []).filter((o) => checkedOrders[o.id_orden_produccion]);
    if (selectedOrders.length === 0) {
      setMsgModal({ title: "Error", body: "No se encontraron órdenes seleccionadas." });
      return;
    }

    const payload = {
      id_linea_produccion: selectedLineaId,
      ordenes_produccion: selectedOrders.map((o) => ({
        id_orden_produccion: o.id_orden_produccion,
        cantidad_kg: Number(o.cantidad_kg_orden_produccion ?? o.cantidad_kg ?? 0),
      })),
    };

    setLoading(true);
    try {
        // console.log("payload tanda manual:", payload);
      await CrearTandaProduccionManual(payload);
      setMsgModal({ title: "Éxito", body: "Tanda generada y puesta en producción." });
      // quitar las órdenes seleccionadas de la vista local para que no puedan volver a seleccionarse
      setLineas((prev) =>
        prev.map((l) => {
          if (l.id_linea_produccion !== selectedLineaId) return l;
          return {
            ...l,
            ordenes_de_produccion_aceptadas: (l.ordenes_de_produccion_aceptadas ?? []).filter((o) => !checkedOrders[o.id_orden_produccion]),
          };
        })
      );
      setCheckedOrders({});
      // notificar al padre para que refresque si lo desea
      onUpdated?.();
    } catch (error) {
      console.error(error);
      setMsgModal({ title: "Error", body: "Ocurrió un error al generar la tanda. Reintenta." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* <h2 className="text-lg font-semibold mb-3 text-center">Generar Tanda Manual</h2> */}

      <div className="mb-4">
        <label className="block text-sm text-gray-700 mb-1">Seleccionar línea de producción</label>
        <select
          value={selectedLineaId ?? ""}
          onChange={(e) => {
            setSelectedLineaId(Number(e.target.value));
            setCheckedOrders({});
          }}
          className="w-full p-2 border rounded-md bg-white"
        >
          <option value="" disabled>
            -- Seleccionar línea --
          </option>
          {lineas.map((l) => (
            <option key={l.id_linea_produccion} value={l.id_linea_produccion}>
              {l.nombre_linea_produccion} — {l.capacidad_linea_produccion} kg
            </option>
          ))}
        </select>
      </div>

      {lineaSeleccionada ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{lineaSeleccionada.nombre_linea_produccion}</div>
                <div className="text-xs text-gray-500">{lineaSeleccionada.descripcion_linea_produccion}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{capacidadMax} kg</div>
                <div className="text-xs text-gray-500">Capacidad</div>
              </div>
            </div>

            <div className="mt-2 text-sm">
              <div>Seleccionados: {Object.values(checkedOrders).filter(Boolean).length} orden(es)</div>
              <div>Total kg: <span className="font-semibold">{totalKg} kg</span> — Restante: <span className={`${restante === 0 ? "text-red-600" : "text-gray-700"}`}>{restante} kg</span></div>
            </div>
          </div>

          <div className="space-y-2">
            {(lineaSeleccionada.ordenes_de_produccion_aceptadas ?? []).map((o) => {
              const kg = Number(o.cantidad_kg_orden_produccion) || 0;
              const disabled = !checkedOrders[o.id_orden_produccion] && totalKg + kg > capacidadMax;
              return (
                <div key={o.id_orden_produccion} className="bg-white rounded-md p-3 shadow-sm border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{o.nombre_producto}</div>
                          <div className="text-xs text-gray-500">{o.nombre_cliente} {o.apellido_cliente}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{kg} kg</div>
                            <div className="text-xs text-gray-500">Orden: #{o.id_orden_produccion}</div>
                          <div className="text-xs text-gray-500">Cantidad Bultos: {o.cantidad_producto}</div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <div>Creada: {o.fecha_creacion_orden_venta}</div>
                        <div>Entrega solicitada: {o.fecha_entrega_solicitada_orden_venta}</div>
                      </div>

                      {/* materias primas si existieran */}
                      { o.materias_primas_requeridas && o.materias_primas_requeridas.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-primary cursor-pointer">Materias primas ({o.materias_primas_requeridas.length})</summary>
                          <div className="mt-2 space-y-1 text-sm text-gray-700">
                            {(o.materias_primas_requeridas || []).map((mp: OrdenProduccion['materias_primas_requeridas'][number]) => (
                              <div key={mp.id_lote_materia_prima ?? mp.codigo_lote} className="flex justify-between">
                                <div>{mp.nombre_materia_prima} - {mp.codigo_lote}</div>
                                <div className="text-xs text-gray-600">{mp.cantidad_materia_prima} {mp.unidad_medida_materia_prima}</div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <input
                        type="checkbox"
                        checked={!!checkedOrders[o.id_orden_produccion]}
                        onChange={() => toggleCheck(o.id_orden_produccion, kg)}
                        disabled={disabled}
                        className="w-5 h-5"
                        aria-label={`Seleccionar orden ${o.id_orden_produccion}`}
                      />
                      {disabled && <div className="text-xs text-red-600">Excede</div>}
                    </div>
                  </div>
                </div>
              );
            })}
            {(lineaSeleccionada.ordenes_de_produccion_aceptadas ?? []).length === 0 && (
              <div className="text-sm text-gray-500 p-3">No hay órdenes compatibles disponibles.</div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerateClick}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md shadow-sm disabled:opacity-60"
            >
              {loading ? "Procesando..." : "Generar Tanda"}
            </button>
            <button
              onClick={() => { setCheckedOrders({}); }}
              className="px-4 py-2 bg-gray-100 rounded-md"
            >
              Limpiar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500">Seleccioná una línea para ver órdenes.</div>
      )}

      {/* Modal confirmación */}
      <Modal visible={confirmVisible} onClose={() => setConfirmVisible(false)} title="Confirmación">
        <p className="text-sm">
          ESTA TANDA GENERADA MANUALMENTE PUEDE NO SER LA ELECCIÓN MÁS ÓPTIMA PARA LA PLANIFICACIÓN,
          ¿ESTÁ SEGURO DE QUERER PONER EN PROCESO ESTA TANDA?
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={confirmGenerate} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md">Sí, confirmar</button>
          <button onClick={() => setConfirmVisible(false)} className="px-4 py-2 bg-gray-100 rounded-md">Cancelar</button>
        </div>
      </Modal>

      {/* Modal mensajes */}
      <Modal visible={!!msgModal} onClose={() => setMsgModal(null)} title={msgModal?.title ?? ""}>
        <p className="text-sm">{msgModal?.body}</p>
        <div className="mt-4">
          <button onClick={() => setMsgModal(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Cerrar</button>
        </div>
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