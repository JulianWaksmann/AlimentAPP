"use client"

import { SolicitudVenta } from "@/app/models/SolicitudVenta";
import { useEffect, useState } from "react";
import { getPedidosUrgentes } from "@/app/api/pedidosVenta";
import { getOrdenesQueSeRetrasan } from "@/app/api/pedidosVenta";
import { updateEstadoSolicitudVenta } from "@/app/api/pedidosVenta";
import Header from "@/app/components/Header";
import { OrdenProduccionConRetraso } from "@/app/models/OrdenProduccion";

const PedidosUrgentesPage = () => {
    const [pedidosUrgentes, setPedidosUrgentes] = useState<SolicitudVenta[]>([]);
    const [pedido, setPedido] = useState<SolicitudVenta | null>(null);
    const [openModalRetraso, setOpenModalRetraso] = useState(false);
    const [ordenesRetrasadas, setOrdenesRetrasadas] = useState<OrdenProduccionConRetraso[]>([]);
    // NUEVO: estado de carga
    const [loadingRetraso, setLoadingRetraso] = useState(false);

    async function aprobarPedido(id: number) {
        // await updateEstadoSolicitudVenta(id,  "confirmada" );
        console.log(`Pedido ${id} aprobado.`);
        setOpenModalRetraso(false);
        setPedido(null);
        setOrdenesRetrasadas([]);
        setLoadingRetraso(false);
        fetchPedidosUrgentes();
    }

    async function cancelarPedido(id:number){
        // await updateEstadoSolicitudVenta(id,  "cancelada" );
        console.log(`Pedido ${id} cancelado.`);
        fetchPedidosUrgentes();
    }

    async function obtenerRetrasoDeOrdenes(id: number){
        try {
            setLoadingRetraso(true);
            const response = await getOrdenesQueSeRetrasan(id);
            setOrdenesRetrasadas(response);
            console.log(response);
        } catch (e) {
            console.error(e);
            setOrdenesRetrasadas([]);
        } finally {
            setLoadingRetraso(false);
        }
    }

    async function fetchPedidosUrgentes() {
        const response = await getPedidosUrgentes();
        setPedidosUrgentes(response);
    }
    useEffect(() => {
        fetchPedidosUrgentes();
    }, []);

  return (
    <div >
        <Header />
    <div className="p-3">

      <h1 className="text-3xl font-bold mb-4 text-primary text-center">
        Pedidos Urgentes
      </h1>
      {pedidosUrgentes.length === 0 ? (
        <p className="text-center">No hay pedidos urgentes en este momento.</p>
      ) : (
        <ul className="space-y-4">
          {pedidosUrgentes.map((pedido) => (
            <li key={pedido.id_orden_venta} className="border p-4 rounded-lg shadow-sm bg-white">
              <h2 className="text-xl font-semibold mb-2">Pedido #{pedido.id_orden_venta}</h2>
              <p className="text-green-700" ><strong>Valor del Pedido:</strong> ${pedido.valor_total_pedido}</p>

              <p><strong>Cliente:</strong> {pedido.nombre_contacto} {pedido.apellido_contacto}</p>
            <p><strong>Razón Social:</strong> {pedido.razon_social}</p>
            <p><strong>Contacto:</strong> {pedido.telefono} - {pedido.email}</p>
              <p className="text-red-700"><strong>Fecha de Entrega:</strong> {new Date(pedido.fecha_entrega).toLocaleDateString()}</p>
              <div className="mt-2">
                <h3 className="font-semibold">Productos:</h3>
                <ul className="list-disc list-inside">
                  {Array.isArray(pedido.productos) ? (
                    pedido.productos.map((prod) => (
                      <li key={prod.id}>
                        {prod.nombre} - Cantidad: {prod.cantidad} bultos
                      </li>
                    ))
                  ) : (
                    <li>
                      {pedido.productos.nombre} - Cantidad: {pedido.productos.cantidad} bultos
                    </li>
                  )}
                </ul>
              </div>
              <div className="flex justify-between">
                  <button
                    className="rounded bg-success px-4 py-2 text-white hover:bg-green-600"
                    onClick={() => {
                      setPedido(pedido);
                      setOpenModalRetraso(true);
                      // limpiar estado anterior y mostrar loading antes de pedir datos
                      setOrdenesRetrasadas([]);
                      setLoadingRetraso(true);
                      obtenerRetrasoDeOrdenes(pedido.id_orden_venta);
                    }}>
                    Aprobar
                  </button>
                  <button className="rounded bg-error px-4 py-2 text-white hover:bg-red-600"
                  onClick={() => cancelarPedido(pedido.id_orden_venta)}>
                    Rechazar
                  </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {openModalRetraso && pedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            {loadingRetraso ? (
              <div className="flex items-center justify-center py-6">
                <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></span>
                Cargando órdenes retrasadas...
              </div>
            ) : ordenesRetrasadas.length === 0 ? (
              <p>No se retrasará ninguna orden de producción.</p>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4">Órdenes Retrasadas</h2>
                {/* tabla de las ordenes que se retrasaran con la fecha actual y la fecha a la que cambiara */}
                <table className="w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100"><th>Orden</th><th>Fecha Actual</th><th>Nueva Fecha</th></tr>
                  </thead>
                  <tbody>
                    {ordenesRetrasadas?.map((orden) => (
                      <tr key={orden.id_orden_produccion}>
                        <td className="text-center">{orden.id_orden_produccion}</td>
                        <td className="text-center">{orden.fecha_planificada_original}</td>
                        <td className="text-center">{orden.fecha_planificada_nueva}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div className="mt-4 flex justify-between">
              <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={() => {
                  setOpenModalRetraso(false);
                  setOrdenesRetrasadas([]);
                  setLoadingRetraso(false);
                }}
              >
                Cancelar
              </button>
              <button
                disabled={loadingRetraso}
                className={`rounded px-4 py-2 text-white ${loadingRetraso ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
                onClick={() => aprobarPedido(pedido.id_orden_venta)}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
};

export default PedidosUrgentesPage;