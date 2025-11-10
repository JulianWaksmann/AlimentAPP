"use client"

import { SolicitudVenta } from "@/app/models/SolicitudVenta";
import { useEffect, useState } from "react";
import { getPedidosUrgentes } from "@/app/api/pedidosVenta";
import { getOrdenesQueSeRetrasan } from "@/app/api/pedidosVenta";
import { updateEstadoSolicitudVenta } from "@/app/api/pedidosVenta";
import Header from "@/app/components/Header";


const PedidosUrgentesPage = () => {
    const [pedidosUrgentes, setPedidosUrgentes] = useState<SolicitudVenta[]>([]);
    const [pedido, setPedido] = useState<SolicitudVenta | null>(null);
    const [openModalRetraso, setOpenModalRetraso] = useState(false);
    const [ordenesRetrasadas, setOrdenesRetrasadas] = useState<number[]>([]);

    async function aprobarPedido(id: number) {
        // Lógica para aprobar el pedido
        // await updateEstadoSolicitudVenta(id,  "confirmada" );
        console.log(`Pedido ${id} aprobado.`);
        setOpenModalRetraso(false);
        setPedido(null);
        fetchPedidosUrgentes();
    }

    async function cancelarPedido(id:number){
        // await updateEstadoSolicitudVenta(id,  "cancelada" );
        console.log(`Pedido ${id} cancelado.`);
        fetchPedidosUrgentes();
    }

    async function obtenerRetrasoDeOrdenes(id: number){
        const response = await getOrdenesQueSeRetrasan(id);
        setOrdenesRetrasadas(response);
        console.log(response);
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
                  <button className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                  onClick={() => {
                    setPedido(pedido);
                    setOpenModalRetraso(true);
                    obtenerRetrasoDeOrdenes(pedido.id_orden_venta);
                  }}>
                    Aprobar
                  </button>
                  <button className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                  onClick={() => cancelarPedido(pedido.id_orden_venta)}>
                    Rechazar
                  </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {openModalRetraso && pedido && ordenesRetrasadas != null &&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            {ordenesRetrasadas.length === 0 ? (
              <p>No se retrasará ninguna orden de producción.</p>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4">Órdenes Retrasadas</h2>
                <ul className="list-disc list-inside">
                  {ordenesRetrasadas.map((id) => (
                    <li key={id}>Orden #{id}</li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-4 flex justify-between">
              <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={() => setOpenModalRetraso(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
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