"use client";
import { getMateriaPrimaXProovedor, GenerarPedidoMateriaPrima } from "@/app/api/materiaPrima";
import Header from "@/app/components/Header";
import React, { useEffect, useState } from "react";
import { MateriaPrimaXProovedor } from "app/models/MateriaPrimaXProovedor";
import { Proovedor } from "app/models/Proovedor";

const PedidoMateriaPrimaPage = () => {

  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrimaXProovedor[]>([]);
  const [selectedMateriaPrima, setSelectedMateriaPrima] = useState<number | "">("");
  const [selectedProveedor, setSelectedProveedor] = useState<number | "">("");
  const [cantidad, setCantidad] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState<"error"|"success">("success");

  // Obtiene los proveedores de la materia prima seleccionada
  const proveedores: Proovedor[] = React.useMemo(() => {
    if (!selectedMateriaPrima) return [];
    const mp = materiasPrimas.find(mp => mp.id_materia_prima === selectedMateriaPrima);
    return mp?.proveedores || [];
  }, [selectedMateriaPrima, materiasPrimas]);


  useEffect(() => {
    const fetchData = async () => {
      const response = await getMateriaPrimaXProovedor();
      setMateriasPrimas(response);
    };
    fetchData();
  }, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMateriaPrima || !selectedProveedor) {
      setModalMsg("Selecciona materia prima y proveedor.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    const cantidadNum = Number(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      setModalMsg("La cantidad debe ser un número positivo.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      await GenerarPedidoMateriaPrima({
        idMateriaPrima: Number(selectedMateriaPrima),
        idProveedor: Number(selectedProveedor),
        cantidad: cantidadNum
      });
      setModalMsg("Pedido realizado con éxito.");
      setModalType("success");
      setModalOpen(true);
      setSelectedMateriaPrima("");
      setSelectedProveedor("");
      setCantidad("");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al realizar el pedido.";
      setModalMsg(errorMsg);
      setModalType("error");
      setModalOpen(true);
    }
    setLoading(false);
  };

      return (
        <div className="min-h-screen bg-neutral-light">
          <Header />
          <main className="p-4 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-primary mb-4 text-center">Realizar pedido de materia prima</h2>
            <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 flex flex-col gap-4">
              <label className="text-sm font-medium">Materia prima</label>
              <select
                value={selectedMateriaPrima}
                onChange={e => {
                  setSelectedMateriaPrima(Number(e.target.value));
                  setSelectedProveedor("");
                }}
                className="rounded border px-3 py-2"
                required
              >
                <option value="">Selecciona materia prima</option>
                {materiasPrimas.map(mp => (
                  <option key={mp.id_materia_prima} value={mp.id_materia_prima}>{mp.nombre_materia_prima}</option>
                ))}
              </select>
              <label className="text-sm font-medium">Proveedor</label>
              <select
                value={selectedProveedor}
                onChange={e => setSelectedProveedor(Number(e.target.value))}
                className="rounded border px-3 py-2"
                required
                disabled={proveedores.length === 0}
              >
                <option value="">Selecciona proveedor</option>
                {proveedores.map((p: Proovedor) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_contacto} - {p.razon_social}</option>
                ))}
              </select>
              <label className="text-sm font-medium">Cantidad</label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="rounded border px-3 py-2"
                placeholder="Cantidad"
                required
              />
              <button type="submit" disabled={loading} className="bg-primary text-white rounded py-2 font-semibold mt-2 hover:opacity-90 transition">
                {loading ? "Enviando..." : "Pedir"}
              </button>
            </form>
            {/* Modal */}
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
          </main>
        </div>
      );
        // ...existing code...
};

export default PedidoMateriaPrimaPage;
