import React, { useState } from "react";
import { LineaDeProduccion } from "@/app/models/LineaDeProduccion";
import { UpdateEstadoLineaProduccion, updateLineaProduccion } from "@/app/api/lineaProduccion";

type Props = {
  lineas: LineaDeProduccion[];
  onUpdated?: () => void; // callback opcional para que el padre refresque
};

export default function TablaLineasProduccion({ lineas, onUpdated }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);
  const [localLineas, setLocalLineas] = useState<LineaDeProduccion[]>(lineas || []);

  // Mantener localmente cambios cuando el prop cambia
  React.useEffect(() => setLocalLineas(lineas || []), [lineas]);

  const handleToggleEstado = async (id: number, nuevaEstado: boolean) => {
    try {
      setLoadingId(id);
      await UpdateEstadoLineaProduccion(id, nuevaEstado);
      setLocalLineas((prev) => prev.map(l => l.id === id ? { ...l, estado: nuevaEstado } : l));
      setConfirmToggleId(null);
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      console.error(err);
      const msg = extractMessage(err) || 'No se pudo actualizar el estado. Intenta de nuevo.';
      alert(msg);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSaveEdits = async (linea: LineaDeProduccion) => {
    if (!linea.id) return;
    try {
      setLoadingId(linea.id);
      await updateLineaProduccion(linea);
      setLocalLineas((prev) => prev.map(l => l.id === linea.id ? linea : l));
      setEditingId(null);
      if (onUpdated) onUpdated();
    } catch (err: unknown) {
      console.error(err);
      const msg = extractMessage(err) || 'Error actualizando la línea';
      alert(msg);
    } finally {
      setLoadingId(null);
    }
  };

function extractMessage(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
  }
  return null;
}

  return (
    <div className="p-3">
      {localLineas.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No hay líneas de producción</div>
      ) : (
        <ul className="space-y-3">
          {localLineas.map((l) => (
            <li key={l.id} className={`bg-white rounded-lg shadow p-3 flex flex-col gap-3 ${l.activa ? "border-l-4 border-green-500" : "opacity-70 border-l-4 border-red-300"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-700 font-semibold">{l.nombre}</div>
                  <div className="text-xs text-gray-500">{l.descripcion}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${l.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.activa ? 'Disponible' : 'Ocupada'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-blue-500 text-white rounded px-3 py-2 text-sm"
                    onClick={() => setEditingId(editingId === l.id ? null : l.id ?? null)}
                  >{editingId === l.id ? 'Cancelar edición' : 'Editar línea'}</button>
                  {/* <button
                    className={`flex-1 ${l.activa ? 'bg-error text-white' : 'bg-success text-white'} rounded px-3 py-2 text-sm`}
                    onClick={() => setConfirmToggleId(l.id ?? null)}
                  >{l.activa ? 'Desactivar' : 'Activar'}</button> */}
                </div>

                {confirmToggleId === l.id && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-sm">¿Seguro que quieres {l.activa ? 'desactivar' : 'activar'} la línea <b>{l.nombre}</b>?</div>
                    <div className="flex gap-2 mt-2">
                      <button className="flex-1 bg-red-500 text-white rounded px-2 py-1 text-sm" onClick={() => setConfirmToggleId(null)}>Cancelar</button>
                      <button className="flex-1 bg-primary text-white rounded px-2 py-1 text-sm" onClick={() => handleToggleEstado(l.id!, !l.activa)}>
                        {loadingId === l.id ? 'Procesando...' : (l.activa ? 'Confirmar desactivar' : 'Confirmar activar')}
                      </button>
                    </div>
                  </div>
                )}

                {editingId === l.id && (
                  <div className="bg-gray-50 rounded p-3">
                    <EditableLineaForm linea={l} onCancel={() => setEditingId(null)} onSave={handleSaveEdits} loadingId={loadingId} />
                  </div>
                )}
                <div className="text-sm text-gray-600">Capacidad máxima de producción: {l.capacidad_maxima_kg} KG</div>
                {l.productos && l.productos.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <div className="font-semibold text-xs mb-1">Productos asignados</div>
                    <ul className="list-disc list-inside text-xs">
                      {l.productos.map((p) => (
                        <li key={p.id}>{p.nombre}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { GetNombreProductos } from '@/app/api/productos';
import { Producto } from '@/app/models/Producto';

function EditableLineaForm({ linea, onCancel, onSave, loadingId }: { linea: LineaDeProduccion; onCancel: () => void; onSave: (l: LineaDeProduccion) => void; loadingId: number | null }) {
  const [nombre, setNombre] = useState(linea.nombre);
  const [descripcion, setDescripcion] = useState(linea.descripcion);
  const [capacidad, setCapacidad] = useState(linea.capacidad_maxima_kg.toString());
  const [activa, setActiva] = useState(linea.activa);
  const [productos, setProductos] = useState<Producto[]>(linea.productos || []);
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    setLoadingProductos(true);
    GetNombreProductos().then(setProductosDisponibles).catch(() => setProductosDisponibles([])).finally(() => setLoadingProductos(false));
  }, []);

  const toggleProducto = (p: Producto) => {
    setProductos((prev) => prev.some(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]);
  };

  const handleGuardar = () => {
    // Validaciones
    const kg = Number(capacidad);
    if (!nombre.trim() || !descripcion.trim() || !capacidad || isNaN(kg) || kg < 1 || kg > 1000 || productos.length === 0) {
      setErrorMsg('Todos los campos son obligatorios. Capacidad debe ser entre 1 y 1000. Selecciona al menos un producto.');
      setShowError(true);
      return;
    }
    onSave({ ...linea, nombre, descripcion, capacidad_maxima_kg: kg, activa, productos });
  };

  return (
    <div className="flex flex-col gap-2">
      {showError && (
        <div className="bg-red-100 text-red-700 rounded p-2 text-xs mb-2 flex justify-between items-center">
          <span>{errorMsg}</span>
          <button className="ml-2 text-xs" onClick={() => setShowError(false)}>X</button>
        </div>
      )}
      <label className="text-xs">Nombre</label>
      <input className="w-full rounded border px-2 py-1 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <label className="text-xs">Descripción</label>
      <textarea className="w-full rounded border px-2 py-1 text-sm" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <label className="text-xs">Capacidad máxima (kg)</label>
      <input type="number" className="w-full rounded border px-2 py-1 text-sm" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} min={1} max={1000} />
      <label className="text-xs">Activa</label>
      <div className="flex items-center gap-2 mb-2">
        <input id="activa-edit" type="checkbox" checked={activa} onChange={e => setActiva(e.target.checked)} />
        <label htmlFor="activa-edit" className="text-sm">La línea está activa</label>
      </div>
      <label className="text-xs">Productos</label>
      {loadingProductos ? (
        <div className="text-xs text-gray-500">Cargando productos...</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-auto">
          {productosDisponibles.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
              <input type="checkbox" checked={productos.some(x => x.id === p.id)} onChange={() => toggleProducto(p)} />
              <span>{p.nombre}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <button className="flex-1 bg-gray-200 rounded px-2 py-1 text-sm" onClick={onCancel}>Cancelar</button>
        <button
          className="flex-1 bg-primary text-white rounded px-2 py-1 text-sm"
          onClick={handleGuardar}
          disabled={loadingId === linea.id}
        >{loadingId === linea.id ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  );
}