import React, { useMemo, useState } from "react";
import { OrdenProduccion } from "../models/OrdenProduccion";

type Props = {
  ordenes: OrdenProduccion[];
  // onEstadoChange?: (id_orden_produccion: number, nuevoEstado: string) => void;
};

const estadoColor: Record<string, string> = {
  en_proceso: "bg-yellow-100 text-yellow-700",
  lista_para_produccion: "bg-blue-100 text-blue-700",
  finalizada: "bg-green-100 text-green-700",
  pendiente: "bg-gray-100 text-gray-700",
  // lista_para_produccion: "bg-purple-100 text-purple-700",
};

const sortOptions = [
  { value: "id_orden_produccion", label: "ID Orden" },
  { value: "id_pedido", label: "ID Pedido" },
  { value: "id_cliente", label: "ID Cliente" },
  { value: "id_producto", label: "ID Producto" },
  { value: "fecha_creacion_orden_venta", label: "Fecha Creación" },
  { value: "fechaentrega_orden_venta", label: "Fecha Entrega" },
  { value: "estado_orden_produccion", label: "Estado" },
];

export default function OrdenesDeProduccionTable({ ordenes }: Props) {
  const [sortKey, setSortKey] = useState<string>("fecha_creacion_orden_venta");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showMateriaPrimaId, setShowMateriaPrimaId] = useState<number | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [clienteFilter, setClienteFilter] = useState<string>("");
  const [productoFilter, setProductoFilter] = useState<string>("");


  const filteredAndSortedOrdenes = useMemo(() => {
    let filtered = [...ordenes];

    if (estadoFilter) {
      filtered = filtered.filter(o => o.estado_orden_produccion === estadoFilter);
    }
    if (clienteFilter) {
      filtered = filtered.filter(o => `${o.nombre_cliente} ${o.apellido_cliente}` === clienteFilter);
    }
    if (productoFilter) {
      filtered = filtered.filter(o => o.nombre_producto.toLowerCase().includes(productoFilter.toLowerCase()));
    }

    filtered.sort((a, b) => {
      let valueA = a[sortKey as keyof OrdenProduccion];
      let valueB = b[sortKey as keyof OrdenProduccion];
      if (
        sortKey === "id_orden_produccion" ||
        sortKey === "id_pedido" ||
        sortKey === "id_cliente" ||
        sortKey === "id_producto"
      ) {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }
      if (
        sortKey === "fecha_creacion_orden_venta" ||
        sortKey === "fechaentrega_orden_venta"
      ) {
        valueA = new Date(valueA as string).getTime();
        valueB = new Date(valueB as string).getTime();
      }
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortAsc ? valueA - valueB : valueB - valueA;
      }
      return sortAsc
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
    return filtered;
  }, [ordenes, sortKey, sortAsc, estadoFilter, clienteFilter, productoFilter]);

  const availableEstados = useMemo(() => [...new Set(ordenes.map(o => o.estado_orden_produccion))], [ordenes]);
  const availableClientes = useMemo(() => [...new Set(ordenes.map(o => `${o.nombre_cliente} ${o.apellido_cliente}`))], [ordenes]);

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
              <h2 className="text-xl font-bold text-primary">Órdenes de Producción</h2>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtros */}
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-estado" className="text-sm font-medium">Estado:</label>
            <select
              id="filtro-estado"
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Todos</option>
              {availableEstados.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-cliente" className="text-sm font-medium">Cliente:</label>
            <select
              id="filtro-cliente"
              value={clienteFilter}
              onChange={e => setClienteFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">Todos</option>
              {availableClientes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-producto" className="text-sm font-medium">Producto:</label>
            <input
              type="text"
              id="filtro-producto"
              value={productoFilter}
              onChange={e => setProductoFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Buscar por producto..."
            />
          </div>
          {/* Ordenamiento */}
          <div className="flex items-center gap-2">
            <label htmlFor="ordenar" className="text-sm font-medium">Ordenar por:</label>
            <select
              id="ordenar"
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="ml-2 px-2 py-1 rounded bg-neutral-light text-xs"
              onClick={() => setSortAsc(a => !a)}
              title="Invertir orden"
            >
              {sortAsc ? "Ascendente ↑" : "Descendente ↓"}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile: Cards */}
      <div className=" mt-6 min-w-full  ">
        {filteredAndSortedOrdenes.map((orden) => (
          <div key={orden.id_orden_produccion} className="rounded-lg border p-3 shadow-sm bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary">Orden #{orden.id_orden_produccion}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor[orden.estado_orden_produccion] || "bg-gray-200 text-gray-700"}`}>
                {orden.estado_orden_produccion.replaceAll("_", " ")}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold mb-1 text-xs text-center bg-details rounded-full px-2 py-1 text-black">Pedido: {orden.id_orden_venta}</span> 
            <span className="font-semibold mb-1 text-sm">Cliente: {orden.nombre_cliente} {orden.apellido_cliente}    </span>              
            </div>
            <div className="text-sm"><span className="font-semibold">Producto:</span> {orden.nombre_producto} </div>
            <div className='text-sm'><span className='font-semibold'>Cantidad:</span> {orden.cantidad_producto}</div>
            <div className="text-sm"><span className="font-semibold">Fecha creación de orden de producción:</span> {orden.fecha_creacion_orden_produccion ? (new Date(orden.fecha_creacion_orden_produccion ).getTime() > 0 ? new Date(orden.fecha_creacion_orden_produccion ).toLocaleDateString() : "-") : "-"}</div>
            <div className="text-sm"><span className="font-semibold">Fecha fin de orden de producción:</span> {orden.fecha_fin_orden_produccion ? (new Date(orden.fecha_fin_orden_produccion ).getTime() > 0 ? new Date(orden.fecha_fin_orden_produccion).toLocaleDateString() : "-") : "-"}</div>
            <div className="text-sm"><span className="font-semibold">Fecha entrega del pedido:</span> {orden.fecha_entrega_solicitada_orden_venta ? (new Date(orden.fecha_entrega_solicitada_orden_venta).getTime() > 0 ? new Date(orden.fecha_entrega_solicitada_orden_venta).toLocaleDateString() : "-") : "-"}</div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 bg-success text-white rounded px-2 py-1 text-xs" 
                onClick={() => setShowMateriaPrimaId(showMateriaPrimaId === orden.id_orden_produccion ? null : orden.id_orden_produccion)}>
                {showMateriaPrimaId === orden.id_orden_produccion ? "Ocultar materia prima" : "Ver materia prima"}
              </button>
            </div>
            {orden.materias_primas_requeridas.length > 0 && showMateriaPrimaId === orden.id_orden_produccion && (
                  <div className="mt-2"><span className="font-semibold">Materias primas utilizadas:</span>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {orden.materias_primas_requeridas.map((mp) => (
                            <li key={mp.id_lote_materia_prima}>
                                {mp.nombre_materia_prima} - {mp.cantidad_materia_prima} {mp.unidad_medida_materia_prima} (Lote: {mp.codigo_lote})
                            </li>
                        ))}
                      </ul>
                  </div>
            )}           
          </div>
        ))}
      </div>
    </div>
  );
}