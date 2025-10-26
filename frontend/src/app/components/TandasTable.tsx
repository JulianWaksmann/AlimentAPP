"use client";
import React, { useState } from "react";
import type { Tanda } from "@/app/models/Tanda"; // ajusta la ruta si tu modelo tiene otro nombre/ruta
import { OrdenProduccion } from "../models/OrdenProduccion";

type Props = {
  tandas: Tanda[];
  className?: string;
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString() : "—";

export default function TandasTable({ tandas, className }: Props) {
  const [expandedLineas, setExpandedLineas] = useState<Record<number, boolean>>({});
  const [expandedOrdenes, setExpandedOrdenes] = useState<Record<number, boolean>>({});
  const fechaActual = new Date();

  const toggleLinea = (id: number) =>
    setExpandedLineas((s) => ({ ...s, [id]: !s[id] }));

  const toggleOrden = (id: number) =>
    setExpandedOrdenes((s) => ({ ...s, [id]: !s[id] }));

  if (!tandas || tandas.length === 0) {
    return <div className="p-4 text-center text-sm text-gray-500">No hay tandas para mostrar</div>;
  }

  return (
    <div className={`space-y-4 p-4 ${className ?? ""}`}>
      {tandas.map((tanda, idx) => {
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
                  Línea #{lineaId}{" "}
                  {tanda.nombre_linea_produccion ? <span className="text-sm text-gray-500">· {tanda.nombre_linea_produccion}</span> : null}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {ordenes.length} orden{ordenes.length !== 1 ? "es" : ""} — Estado:{" "}
                  <span className={`font-medium ${tanda.activa_linea_produccion == true ? "text-green-600" : "text-red-600"}`}>
                    {tanda.activa_linea_produccion == true ? "Disponible" : "No disponible" }
                  </span>
                </p>
              </div>

              <button
                onClick={() => toggleLinea(lineaId)}
                aria-expanded={!!expandedLineas[lineaId]}
                className="text-sm px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
              >
                {expandedLineas[lineaId] ? "Ocultar" : "Ver"}
              </button>
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
                            {/* <div>Tiempo estimado: {orden.tiempo_estimado_min ?? "—"} min</div> */}
                            <div className="mt-1">
                                {/* si la tanda tiene fecha de entrega solciitada mayor a la actual se muestra estado = retrasada, sino no */}
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

                        {/* <a
                          className="text-sm px-3 py-1 rounded-md bg-primary text-white hover:opacity-95"
                          href={`#/orden/${orden.id_orden_produccion}`}
                        >
                          Abrir orden
                        </a> */}
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
                            {/* <div>
                              <strong>Fecha entrega real:</strong> {formatDate(orden.fecha_entrega_real_orden_venta)}
                            </div> */}
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
    </div>
  );
}