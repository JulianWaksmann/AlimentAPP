
import { OrdenProduccion } from '@/app/models/OrdenProduccion';
import React, { useState } from 'react';

interface TablaOrdenesDeTrabajoProps {
    ordenes: OrdenProduccion[];
    estadoSiguiente?: string;
    onCambiarEstado: (id: number) => Promise<void>;
}

const TablaOrdenesDeTrabajo: React.FC<TablaOrdenesDeTrabajoProps> = ({ ordenes, estadoSiguiente, onCambiarEstado }) => {
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [showMateriaPrimaId, setShowMateriaPrimaId] = useState<number | null>(null);

    const handleCambiarEstado = async (id: number) => {
        setLoadingId(id);
        await onCambiarEstado(id);
        setLoadingId(null);
        setConfirmId(null);
    };

    return (
        <div className="w-full  mx-auto p-2">
            {ordenes.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No hay órdenes de trabajo pendientes</div>
            ) : (
                <ul className="space-y-3">
                    {ordenes.map((orden) => (
                        <li key={orden.id_orden_produccion} className="bg-white rounded-lg shadow p-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-primary">Orden #{orden.id_orden_produccion}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">{orden.estado_orden_produccion}</span>
                            </div>
                            <div className="text-sm"><span className="font-semibold">Cliente:</span> {orden.nombre_cliente} {orden.apellido_cliente}</div>
                            <div className="text-sm"><span className="font-semibold">Producto:</span> {orden.nombre_producto} </div>
                            <div className='text-sm'><span className='font-semibold'>Cantidad:</span> {orden.cantidad_producto}</div>
                            <div className="text-sm"><span className="font-semibold">Fecha creación de orden de producción:</span> {orden.fecha_creacion_orden_produccion ? (new Date(orden.fecha_creacion_orden_produccion ).getTime() > 0 ? new Date(orden.fecha_creacion_orden_produccion ).toLocaleDateString() : "-") : "-"}</div>
                            <div className="text-sm"><span className="font-semibold">Fecha fin de orden de producción:</span> {orden.fecha_fin_orden_produccion ? (new Date(orden.fecha_fin_orden_produccion ).getTime() > 0 ? new Date(orden.fecha_fin_orden_produccion).toLocaleDateString() : "-") : "-"}</div>
                            <div className="text-sm"><span className="font-semibold">Fecha entrega del pedido:</span> {orden.fecha_entrega_solicitada_orden_venta ? (new Date(orden.fecha_entrega_solicitada_orden_venta).getTime() > 0 ? new Date(orden.fecha_entrega_solicitada_orden_venta).toLocaleDateString() : "-") : "-"}</div>
                            <div className="flex gap-2 mt-2">
                                {/* {estadoSiguiente ? (
                                    <button
                                        className="flex-1 bg-details text-black rounded px-2 py-1 text-xs"
                                        onClick={() => setConfirmId(orden.id_orden_produccion)}
                                    >
                                        Cambiar estado a {estadoSiguiente}
                                    </button>
                                ) : null} */}
                                <button
                                    className="flex-1 bg-blue-500 text-white rounded px-2 py-1 text-xs"
                                    onClick={() => setShowMateriaPrimaId(showMateriaPrimaId === orden.id_orden_produccion ? null : orden.id_orden_produccion)}
                                >
                                    {showMateriaPrimaId === orden.id_orden_produccion ? "Ocultar materia prima" : "Ver materia prima"}
                                </button>
                            </div>
                            {orden.materias_primas_requeridas.length > 0 && showMateriaPrimaId === orden.id_orden_produccion && (
                                <div className="mt-2">
                                    <span className="font-semibold">Materias primas requeridas:</span>
                                    <ul className="list-disc list-inside text-sm mt-1">
                                        {orden.materias_primas_requeridas.map((mp) => (
                                            <li key={mp.id_lote_materia_prima}>
                                                {mp.nombre_materia_prima} - {mp.cantidad_materia_prima} {mp.unidad_medida_materia_prima} (Lote: {mp.codigo_lote})
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {confirmId === orden.id_orden_produccion && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <span className="text-xs text-gray-700">¿Confirmar cambio de estado a <b>{estadoSiguiente}</b>?</span>
                                    <div className="flex gap-2">
                                        <button
                                            className="flex-1 bg-details text-black rounded px-2 py-1 text-xs"
                                            disabled={loadingId === orden.id_orden_produccion}
                                            onClick={() => handleCambiarEstado(orden.id_orden_produccion)}
                                        >
                                            {loadingId === orden.id_orden_produccion ? "Cambiando..." : "Confirmar"}
                                        </button>
                                        <button
                                            className="flex-1 bg-red-500  text-white rounded px-2 py-1 text-xs"
                                            onClick={() => setConfirmId(null)}
                                        >Cancelar</button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TablaOrdenesDeTrabajo;