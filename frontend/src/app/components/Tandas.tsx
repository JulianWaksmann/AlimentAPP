"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Tanda } from "@/app/models/Tanda";
import { GetTandas } from "@/app/api/tandas";

export interface TandasProps {
  estadoOP: string;
  cambiarEstado: (id_tandas: number[]) => void | Promise<void>;
  estadoNuevo?: string;
}

interface TandaProduccionItem {
  id_tanda_produccion: number;
  id_orden_produccion?: number | null;
  nombre_producto?: string | null;
  cantidad_kg_tanda?: number | null;
  estado_tanda_produccion?: string | null;
  nombre_cliente?: string | null;
  apellido_cliente?: string | null;
  fecha_creacion_orden_venta?: string | null;
  fecha_entrega_solicitada_orden_venta?: string | null;
  materias_primas_requeridas: {
    codigo_lote: string;
    id_materia_prima: number;
    nombre_materia_prima: string;
    id_lote_materia_prima: number;
    cantidad_materia_prima: number;
    unidad_medida_materia_prima: string;
  }[];
}

interface LineaProduccion {
  id_linea_produccion: number;
  nombre_linea_produccion: string;
  tandas_de_produccion?: TandaProduccionItem[];
}

const Tandas: React.FC<TandasProps> = ({
  estadoOP,
  cambiarEstado,
  estadoNuevo,
}) => {
  const [lineas, setLineas] = useState<LineaProduccion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verMateriaPrima, setVerMateriaPrima] = useState<boolean>(false);
  const [materiaPrimaTanda, setMateriaPrimaTanda] =
    useState<TandaProduccionItem | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedLinea, setSelectedLinea] = useState<{
    id_linea: number | null;
    nombre: string | null;
    ids: number[];
  } | null>(null);

  const destino = useMemo(() => {
    if (estadoNuevo?.trim()) return estadoNuevo;
    const e = estadoOP.toLowerCase();
    if (e === "planificada") return "en_progreso";
    if (e === "en_progreso") return "completada";
    return "completada";
  }, [estadoOP, estadoNuevo]);

  const fetchTandas = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await GetTandas(estadoOP);
      const lineasMapeadas: LineaProduccion[] = data.map((tanda) => ({
        id_linea_produccion: tanda.id_linea_produccion ?? 0,
        nombre_linea_produccion: tanda.nombre_linea_produccion ?? "Sin nombre",
        tandas_de_produccion: (tanda.tandas_de_produccion ?? []).map((t) => ({
          id_tanda_produccion: t.id_tanda_produccion ?? 0,
          id_orden_produccion: t.id_orden_produccion ?? null,
          nombre_producto: t.nombre_producto ?? null,
          cantidad_kg_tanda: t.cantidad_kg_tanda ?? null,
          estado_tanda_produccion: t.estado_tanda_produccion ?? null,
          nombre_cliente: t.nombre_cliente ?? null,
          apellido_cliente: t.apellido_cliente ?? null,
          fecha_creacion_orden_venta: t.fecha_creacion_orden_venta ?? null,
          fecha_entrega_solicitada_orden_venta:
            t.fecha_entrega_solicitada_orden_venta ?? null,
          materias_primas_requeridas: (t.materias_primas_requeridas ?? []).map(
            (mp) => ({
              codigo_lote: mp.codigo_lote,
              id_materia_prima: mp.id_materia_prima,
              nombre_materia_prima: mp.nombre_materia_prima,
              id_lote_materia_prima: mp.id_lote_materia_prima,
              cantidad_materia_prima: Number(mp.cantidad_materia_prima),
              unidad_medida_materia_prima: mp.unidad_medida_materia_prima,
            })
          ),
        })),
      }));
      console.log(lineasMapeadas);
      setLineas(lineasMapeadas);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al obtener tandas"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTandas();
  }, [estadoOP]);

  const openConfirm = (linea: LineaProduccion) => {
    const ids = (linea.tandas_de_produccion ?? [])
      .map((t) => t.id_tanda_produccion)
      .filter((id): id is number => typeof id === "number");
    setSelectedLinea({
      id_linea: linea.id_linea_produccion ?? null,
      nombre: linea.nombre_linea_produccion ?? null,
      ids,
    });
    setConfirmOpen(true);
  };

  const doConfirm = async () => {
    if (!selectedLinea || selectedLinea.ids.length === 0) {
      setConfirmOpen(false);
      return;
    }
    try {
      setConfirmLoading(true);
      await cambiarEstado(selectedLinea.ids);
      await fetchTandas();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setSelectedLinea(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="h-5 w-2/3 rounded bg-gray-200" />
              <div className="mt-3 h-4 w-1/2 rounded bg-gray-200" />
              <div className="mt-6 space-y-2">
                <div className="h-10 rounded bg-gray-100" />
                <div className="h-10 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {errorMsg}
        </div>
      </div>
    );
  }

  if (lineas.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
          No hay tandas en estado “{estadoOP}”.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {lineas.map((linea, idx) => {
          const lineaId = linea.id_linea_produccion ?? idx;
          const nombreLinea =
            linea.nombre_linea_produccion ?? `Línea #${lineaId}`;
          const tandas = linea.tandas_de_produccion ?? [];
          const idsTandas = tandas
            .map((t) => t.id_tanda_produccion)
            .filter((id): id is number => typeof id === "number");

          return (
            <article
              key={lineaId}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {nombreLinea}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tandas.length} tandas · estado actual: {estadoOP}
                  </p>
                </div>
                <button
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                    idsTandas.length === 0
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                  disabled={idsTandas.length === 0}
                  onClick={() => openConfirm(linea)}
                  title={
                    idsTandas.length === 0
                      ? "No hay tandas para actualizar"
                      : `Cambiar a ${destino}`
                  }
                >
                  Cambiar a “{destino}”
                </button>
              </header>

              <ul className="divide-y divide-gray-100">
                {tandas.map((tanda, i) => {
                  const itemKey = `${lineaId}-${
                    tanda.id_tanda_produccion ?? i
                  }`;
                  return (
                    <li key={itemKey} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="text-sm text-gray-600">
                            Orden #{tanda.id_orden_produccion ?? "—"}
                          </div>
                          <div className="text-base font-medium text-gray-800">
                            {tanda.nombre_producto ?? "Producto"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tanda.cantidad_kg_tanda ?? "—"} kg ·{" "}
                            {tanda.estado_tanda_produccion ?? "—"}
                          </div>
                          {(tanda.nombre_cliente || tanda.apellido_cliente) && (
                            <div className="text-sm text-gray-500">
                              Cliente: {tanda.nombre_cliente}{" "}
                              {tanda.apellido_cliente}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {/* <div>
                              Fecha P:{" "}
                              {tanda.fecha_creacion_orden_venta
                                ? new Date(tanda.fecha_creacion_orden_venta).toLocaleDateString()
                                : "—"}
                            </div> */}
                          <div>
                            Entrega solicitada:{" "}
                            {tanda.fecha_entrega_solicitada_orden_venta
                              ? new Date(
                                  tanda.fecha_entrega_solicitada_orden_venta
                                ).toLocaleDateString()
                              : "—"}
                          </div>
                          <div>
                            <button
                              className="rounded p-1 bg-primary-softer"
                              onClick={() => {
                                setVerMateriaPrima(true);
                                setMateriaPrimaTanda(tanda);
                              }}
                            >
                              Ver Materia Prima
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* {verMateriaPrima && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="bg-white rounded-lg p-3 max-w-md w-full">
                            <div className="flex justify-between">
                            <h4 className="font-semibold">Materia Prima</h4>
                            <button
                              className="mt-2 rounded p-1 bg-primary-softer"
                              onClick={() => setVerMateriaPrima(false)}
                            >
                              Cerrar
                            </button>
                            </div>
                            <ul>
                              {(materiaPrimaTanda?.materias_primas_requeridas ?? []).map((mp) => (
                                <li key={mp.id_materia_prima + "-" + mp.id_lote_materia_prima} className="flex justify-between">
                                <div className="grid col-span-1">
                                  <span className="text-xs" >{mp.nombre_materia_prima}</span>
                                    <span className="text-xs text-gray-600" >lote: {mp.codigo_lote}</span>
                                </div>      
                                <span>{mp.cantidad_materia_prima} kg</span>
                                <hr />
                                </li>
                                
                              ))}
                            </ul>

                          </div>
                            </div>
                        )} */}
                      {verMateriaPrima && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                          onClick={() => setVerMateriaPrima(false)}
                        >
                          <div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Header fijo */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                              <h4 className="text-lg font-semibold text-gray-800">
                                Materias Primas Requeridas
                              </h4>
                              <button
                                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
                                onClick={() => setVerMateriaPrima(false)}
                                aria-label="Cerrar"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>

                            {/* Contenido scrolleable */}
                            <div className="overflow-y-auto flex-1 p-4">
                              {(
                                materiaPrimaTanda?.materias_primas_requeridas ??
                                []
                              ).length === 0 ? (
                                <p className="text-center text-gray-500 py-8">
                                  No hay materias primas registradas
                                </p>
                              ) : (
                                <ul className="divide-y divide-gray-200">
                                  {materiaPrimaTanda?.materias_primas_requeridas.map(
                                    (mp) => (
                                      <li
                                        key={`${mp.id_materia_prima}-${mp.id_lote_materia_prima}`}
                                        className="py-2 first:pt-0 last:pb-0 hover:bg-gray-50 rounded-lg px-3 transition"
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 min-w-0">
                                            <h5 className="font-medium text-gray-900 truncate">
                                              {mp.nombre_materia_prima}
                                            </h5>
                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                                                Lote: {mp.codigo_lote}
                                              </span>
                                              {/* <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                        ID: {mp.id_materia_prima}
                      </span> */}
                                            </div>
                                          </div>
                                          <div className="flex-shrink-0 text-right">
                                            <div className="text-lg font-semibold text-indigo-600">
                                              {mp.cantidad_materia_prima}
                                            </div>
                                            <div className="text-xs text-gray-500 uppercase">
                                              {mp.unidad_medida_materia_prima}
                                            </div>
                                          </div>
                                        </div>
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}
                            </div>

                            {/* Footer opcional con total */}
                            {(
                              materiaPrimaTanda?.materias_primas_requeridas ??
                              []
                            ).length > 0 && (
                              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-gray-700">
                                    Total de materias primas:
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {
                                      materiaPrimaTanda
                                        ?.materias_primas_requeridas.length
                                    }
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      <ConfirmModal
        open={confirmOpen}
        loading={confirmLoading}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmOpen(false);
            setSelectedLinea(null);
          }
        }}
        onConfirm={doConfirm}
        title="Confirmar cambio de estado"
      >
        {selectedLinea && (
          <div className="space-y-2">
            <p>
              Vas a cambiar {selectedLinea.ids.length} tanda(s) de la línea{" "}
              <strong>
                {selectedLinea.nombre || `#${selectedLinea.id_linea ?? "—"}`}
              </strong>{" "}
              a estado “{destino}”.
            </p>
            <p className="text-sm text-gray-500">¿Confirmás la acción?</p>
          </div>
        )}
      </ConfirmModal>
    </>
  );
};

export default Tandas;

type ConfirmProps = {
  open: boolean;
  loading?: boolean;
  title?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: React.ReactNode;
};

const ConfirmModal: React.FC<ConfirmProps> = ({
  open,
  loading,
  title,
  onConfirm,
  onCancel,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative w-full sm:max-w-md sm:w-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-lg p-5 sm:p-6">
        <h4 className="text-lg font-semibold text-gray-800">
          {title || "Confirmación"}
        </h4>
        <div className="mt-3 text-gray-700">{children}</div>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-white ${
              loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Aplicando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};
