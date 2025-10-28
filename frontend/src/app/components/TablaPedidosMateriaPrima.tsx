"use client";
import React, { useEffect, useState } from "react";
import { PedidoMateriaPrima } from "@/app/models/PedidoMateriaPrima";
import { getAllPedidosMateriaPrima, updateEstadoPedidoMateriaPrima, cancelarPedidoMateriaPrima } from "@/app/api/materiaPrima";

const TablaPedidosMateriaPrima = () => {
  const [pedidos, setPedidos] = useState<PedidoMateriaPrima[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [recepcionId, setRecepcionId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [form, setForm] = useState({
    estado: "",
    fecha_vencimiento: "",
    codigo_lote: "",
    observaciones: "",
  });
  const [loading, setLoading] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState<"error"|"success">("success");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchPedidos = async () => {
    try {
      const response = await getAllPedidosMateriaPrima();
      setPedidos(response);
      console.log(response);
    } catch {
      setModalMsg("Error al cargar pedidos");
      setModalType("error");
      setModalOpen(true);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const estadosRecepcion = [
    { label: "Aceptado", value: "disponible" },
    { label: "Rechazado", value: "rechazado" },
    { label: "En cuarentena", value: "en_cuarentena" },
  ];

  const handleRecepcion = async (pedido: PedidoMateriaPrima) => {
    setLoading(true);
    try {
      await updateEstadoPedidoMateriaPrima(
        pedido.id,
        form.fecha_vencimiento,
        form.estado,
        form.observaciones,
        form.codigo_lote
      );
      setModalMsg("Recepción registrada correctamente.");
      setModalType("success");
      setModalOpen(true);
      setRecepcionId(null);
      setForm({ estado: "", fecha_vencimiento: "", codigo_lote: "", observaciones: "" });
      fetchPedidos();
    } catch {
      setModalMsg("Error al registrar la recepción.");
      setModalType("error");
      setModalOpen(true);
    }
    setLoading(false);
  };

  const handleCancelar = async (id: number) => {
    setLoading(true);
    try {
      await cancelarPedidoMateriaPrima(id);
      setModalMsg("Pedido cancelado correctamente.");
      setModalType("success");
      setModalOpen(true);
      setCancelId(null);
      fetchPedidos();
    } catch {
      setModalMsg("Error al cancelar el pedido.");
      setModalType("error");
      setModalOpen(true);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-2">
      <h2 className="text-xl font-bold mb-4 text-center text-primary">Pedidos de materia prima</h2>
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white text-xs sm:text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Materia Prima</th>
              <th className="p-2">Cantidad</th>
              <th className="p-2">Proveedor</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4">No hay pedidos en espera de materia prima.</td>
              </tr>
            ) : (
              pedidos.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="border-b">
                    <td className="p-2 text-center">{p.id_materia_prima}</td>
                    <td className="p-2">{p.nombre_materia_prima}</td>
                    <td className="p-2 text-center">{p.cantidad_total}</td>
                    <td className="p-2">{p.razon_social_proveedor} <button className="text-blue-600 underline" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                        Ver más
                      </button></td>
                    <td className="p-2 text-center">{p.fecha_generacion_pedido.split(" ")[0]}</td>
                    <td className="p-2 flex flex-col gap-1 sm:flex-row">
                      {/* <button className="text-blue-600 underline" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                        Ver más
                      </button> */}
                      <button className="text-s text-white rounded bg-green-600 p-1 hover:opacity-90 transition" onClick={() => setRecepcionId(p.id)}>
                        Recibir
                      </button>
                      <button className="text-s text-white rounded bg-red-600 p-1 hover:opacity-90 transition" onClick={() => setCancelId(p.id)}>
                        Cancelar
                      </button>
                    </td>
                  </tr>
            
                  
                  {expandedId === p.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="p-2">
                        <div className="flex flex-col gap-1 text-xs sm:text-sm">
                          <span><b>Teléfono:</b> {p.telefono_proveedor}</span>
                          <span><b>Email:</b> {p.email_proveedor}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {recepcionId === p.id && (
                    <tr className="bg-green-50">
                      <td colSpan={7} className="p-2">
                        <form className="flex flex-col gap-2" onSubmit={e => {e.preventDefault(); handleRecepcion(p);}}>
                          <div className="flex flex-col gap-1">
                            <span><b>ID:</b> {p.id_materia_prima}</span>
                            <span><b>Materia Prima:</b> {p.nombre_materia_prima}</span>
                            <span><b>Cantidad:</b> {p.cantidad_total}</span>
                            <span><b>Proveedor:</b> {p.razon_social_proveedor}</span>
                            <span><b>Fecha:</b> {p.fecha_generacion_pedido.split(" ")[0]}</span>
                          </div>
                          <label className="text-sm font-medium">Estado de recepción</label>
                          <select required className="border rounded px-2 py-1" value={form.estado} onChange={e => setForm(f => ({...f, estado: e.target.value}))}>
                            <option value="">Selecciona estado</option>
                            {estadosRecepcion.map(e => (
                              <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                          </select>
                          <label className="text-sm font-medium">Fecha de vencimiento (opcional)</label>
                          <input type="date" className="border rounded px-2 py-1" value={form.fecha_vencimiento} onChange={e => setForm(f => ({...f, fecha_vencimiento: e.target.value}))} />
                          <label className="text-sm font-medium">Código de lote (opcional)</label>
                          <input type="text" className="border rounded px-2 py-1" value={form.codigo_lote} onChange={e => setForm(f => ({...f, codigo_lote: e.target.value}))} />
                          <label className="text-sm font-medium">Observaciones (opcional)</label>
                          <textarea className="border rounded px-2 py-1" value={form.observaciones} onChange={e => setForm(f => ({...f, observaciones: e.target.value}))} />
                          <div className="flex gap-2 mt-2">
                            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-1 rounded font-semibold">Registrar</button>
                            <button type="button" className="bg-gray-400 text-white px-4 py-1 rounded font-semibold" onClick={() => setRecepcionId(null)}>Cancelar</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                  {cancelId === p.id && (
                    <tr className="bg-red-50">
                      <td colSpan={7} className="p-2">
                        <div className="flex flex-col gap-2">
                          <span>¿Seguro que quieres cancelar el pedido?</span>
                          <div className="flex gap-2">
                            <button className="bg-red-600 text-white px-4 py-1 rounded font-semibold" onClick={() => handleCancelar(p.id)}>Confirmar</button>
                            <button className="bg-gray-400 text-white px-4 py-1 rounded font-semibold" onClick={() => setCancelId(null)}>Volver</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Modal feedback */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-lg p-6 shadow-lg w-80 text-center ${modalType === "error" ? "bg-red-50 border border-red-300" : "bg-green-50 border border-green-300"}`}>
            <h3 className={`text-lg font-bold mb-2 ${modalType === "error" ? "text-red-600" : "text-green-600"}`}>{modalType === "error" ? "Error" : "Éxito"}</h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2 rounded font-semibold ${modalType === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"} hover:opacity-90 transition`}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaPedidosMateriaPrima; 