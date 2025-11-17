"use client";

import React, { useEffect, useState } from "react";
import TablaLineasProduccion from "@/app/components/TablaLineasProduccion";
import { GetNombreProductos } from '@/app/api/productos';
import { createLineaProduccion } from '@/app/api/lineaProduccion';
import { Producto } from '@/app/models/Producto';
import { LineaDeProduccion } from "@/app/models/LineaDeProduccion";
import { GetLineasProduccion } from "@/app/api/lineaProduccion";
import Header from "@/app/components/Header";

export default function PageLineasProduccion() {
  const [lineas, setLineas] = useState<LineaDeProduccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLineas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await GetLineasProduccion();
      setLineas(data);
      console.log(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las líneas");
    } finally {
      setLoading(false);
    }
  };

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [crearLoading, setCrearLoading] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [descripcionNueva, setDescripcionNueva] = useState("");
  const [capacidadKg, setCapacidadKg] = useState<string>("");
  const [productosSeleccionados, setProductosSeleccionados] = useState<number[]>([]);
  const [activaNueva, setActivaNueva] = useState<boolean>(true);

  const openCreateForm = async () => {
    setShowCreateForm(true);
    try {
      const prods = await GetNombreProductos();
      setProductosDisponibles(prods || []);
    } catch (err) {
      console.error(err);
      setProductosDisponibles([]);
    }
  };

  const toggleProductoSeleccionado = (id: number) => {
    setProductosSeleccionados((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCrear = async () => {
    // Validaciones
    const errores: string[] = [];
    if (!nombreNuevo.trim()) errores.push('El nombre es obligatorio.');
    if (!descripcionNueva.trim()) errores.push('La descripción es obligatoria.');
    const kg = Number(capacidadKg);
    if (!capacidadKg || Number.isNaN(kg)) errores.push('La capacidad en kg es obligatoria.');
    else if (kg < 1 || kg > 1000) errores.push('La capacidad debe ser entre 1 y 1000 kg.');
    if (productosSeleccionados.length === 0) errores.push('Debe seleccionar al menos un producto.');

    if (errores.length > 0) {
      setModalErrors(errores);
      setShowModalErrors(true);
      return;
    }
    setCrearLoading(true);
    try {
      // Construir payload tipado
      const payload = {
        nombre: nombreNuevo,
        descripcion: descripcionNueva,
        productos: productosSeleccionados,
        capacidad_maxima_kg: capacidadKg ? Number(capacidadKg) : undefined,
        activa: activaNueva,
      };
      await createLineaProduccion(payload);
      // limpiar y refrescar
      setNombreNuevo('');
      setDescripcionNueva('');
      setCapacidadKg('');
      setProductosSeleccionados([]);
      setActivaNueva(true);
      setShowCreateForm(false);
      await fetchLineas();
    } catch (err) {
      console.error(err);
      alert('No se pudo crear la línea. Revisa la consola.');
    } finally {
      setCrearLoading(false);
    }
  };

  // Modal de errores
  const [showModalErrors, setShowModalErrors] = useState(false);
  const [modalErrors, setModalErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchLineas();
  }, []);

  return (
    <div>
      <Header />
      <div className="p-4">
      <h1 className="text-xxl font-bold text-center mb-3">Líneas de Producción</h1>

      <div className="mb-4 flex flex-col gap-2">
        {!showCreateForm ? (
          <button className="bg-primary text-white px-3 py-2 rounded" onClick={openCreateForm}>Crear nueva línea de producción</button>
        ) : (
          <>
            {showModalErrors && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-lg p-4 w-11/12 max-w-md">
                  <div className="font-semibold mb-2">Errores en el formulario</div>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {modalErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                  <div className="mt-4 text-right">
                    <button className="px-3 py-1 bg-primary text-white rounded" onClick={() => setShowModalErrors(false)}>Cerrar</button>
                  </div>
                </div>
              </div>
            )}
          
          <div className="bg-white p-3 rounded shadow">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Nueva línea de producción</div>
              <button className="text-sm text-gray-500" onClick={() => setShowCreateForm(false)}>Cerrar</button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs">Nombre</label>
              <input className="w-full rounded border px-2 py-1 text-sm" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} />

              <label className="text-xs">Descripción</label>
              <textarea className="w-full rounded border px-2 py-1 text-sm" value={descripcionNueva} onChange={(e) => setDescripcionNueva(e.target.value)} />

              <label className="text-xs">Capacidad máxima (kg)</label>
              <input type="number" className="w-full rounded border px-2 py-1 text-sm" value={capacidadKg} onChange={(e) => setCapacidadKg(e.target.value)} />

              <label className="text-xs">Activa</label>
              <div className="flex items-center gap-2">
                <input id="activa" type="checkbox" checked={activaNueva} onChange={(e) => setActivaNueva(e.target.checked)} />
                <label htmlFor="activa" className="text-sm">La línea estará activa</label>
              </div>

              <label className="text-xs">Productos (selecciona)</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                {productosDisponibles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
                    <input type="checkbox" checked={productosSeleccionados.includes(p.id)} onChange={() => toggleProductoSeleccionado(p.id)} />
                    <span>{p.nombre}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <button className="flex-1 bg-gray-200 rounded px-3 py-2" onClick={() => setShowCreateForm(false)}>Cancelar</button>
                <button className="flex-1 bg-primary text-white rounded px-3 py-2" onClick={handleCrear} disabled={crearLoading}>{crearLoading ? 'Creando...' : 'Crear'}</button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {loading && <div className="text-sm text-gray-500">Cargando...</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {/* Pasar la lista y el callback onUpdated */}
      <TablaLineasProduccion lineas={lineas} onUpdated={fetchLineas} />
      </div>
    </div>
  );
}
