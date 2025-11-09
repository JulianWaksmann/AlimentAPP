"use client";
import { useEffect, useState } from "react";
import { getPedidosReprogramados } from "@/app/api/pedidosVenta";
import { updateEstadoSolicitudVenta } from "@/app/api/pedidosVenta";

export type PedidosVentasReprogramado = {
  idpedido: number;
  idcliente: number;
  nombrecliente: string;
  apellidocliente: string;
  fechaPedido: string | null;
  fechaSolicitada: string | null;
  fechaEntrega: string | null;
  productos: {
    idProducto: number;
    nombre: string;
    cantidad: number;
  }[];
  valorPedido: number;
  fechapedido: string;
  fechasolicitada: string;
  fechaplanificada: string;
  valorpedido: string;
};

const PedidosReprogramadosPage = () => {
  const [pedidosReprogramados, setPedidosReprogramados] = useState<
    PedidosVentasReprogramado[]
  >([]);

  const [openModal, setOpenModal] = useState<boolean>(false)

  useEffect(() => {
    async function fetchPedidosReprogramados() {
      const response = await getPedidosReprogramados();
      setPedidosReprogramados(response);
    }
    fetchPedidosReprogramados();
  }, []);

  function cancelarPedido(idpedido: number) {
    // Lógica para cancelar el pedido
    updateEstadoSolicitudVenta(idpedido, "cancelada");
    console.log(`Cancelar pedido con ID: ${idpedido}`);
  }

  return (
    <div>
        {
            openModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Pedido Cancelado</h2>
                        <p>El pedido ha sido cancelado exitosamente.</p>
                        <button 
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={() => setOpenModal(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )
        }
      <h1 className="text-center text-primary text-2xl font-semibold my-3 ">
        PEDIDOS REPROGRAMADOS
      </h1>
      <h4 className="text-center text-gray-600">
        Estos pedidos no se podran entregar en la fecha solicitada, por lo que
        fueron replanificados para entregar lo antes posible
      </h4>
      <div className="overflow-x-auto rounded-lg shadow-lg bg-white p-4">
        <h2 className="text-xl font-bold mb-4 text-primary">
          Pedidos de Venta
        </h2>
        <div className="">
          <div className=" mt-6 space-y-4">
            {pedidosReprogramados.map((pedido: PedidosVentasReprogramado) => (
              <div
                key={pedido.idpedido}
                className="rounded-lg border p-3 shadow-sm bg-gray-50"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-primary">
                    Pedido #{pedido.idpedido}
                  </span>
                  <button className="bg-red-800 rounded p-1 text-white" onClick={() => {cancelarPedido(pedido.idpedido); setOpenModal(true)}}>
                    Cancelar Pedido
                  </button>
                </div>
                <div className="mb-1 text-sm">
                  <span className="font-semibold">
                    Cliente {pedido.idcliente} :
                  </span>{" "}
                  {pedido.nombrecliente} {pedido.apellidocliente}
                </div>
                <div className="mb-1 text-sm">
                  <span className="font-semibold">Fecha Pedido:</span>{" "}
                  {pedido.fechaPedido
                    ? new Date(pedido.fechaPedido).getTime() > 0
                      ? new Date(pedido.fechaPedido).toLocaleDateString()
                      : "-"
                    : "-"}
                </div>
                <div className="mb-1 text-sm">
                  <span className="font-semibold text-red-700">
                    Fecha Solicitada:
                  </span>{" "}
                  {pedido.fechasolicitada
                    ? new Date(pedido.fechasolicitada).getTime() > 0
                      ? new Date(pedido.fechasolicitada).toLocaleDateString()
                      : "-"
                    : "-"}
                </div>

                <div className="mb-1 text-sm">
                  <span className="font-semibold text-green-700">
                    Fecha Nueva Entrega:
                  </span>{" "}
                  {pedido.fechaplanificada
                    ? new Date(pedido.fechaplanificada).getTime() > 0
                      ? new Date(pedido.fechaplanificada).toLocaleDateString()
                      : "-"
                    : "-"}
                </div>
                <div className="mb-1 text-sm font-semibold">Productos:</div>
                <ul className="list-disc pl-5 text-sm">
                  {pedido.productos.map((prod) => (
                    <li key={`${pedido.idpedido}-${prod.idProducto}`}>
                      {prod.nombre}{" "}
                      <span className="text-xs text-gray-500">
                        x{prod.cantidad}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-sm">
                  <span className="font-semibold">Valor Total:</span> $
                  {pedido.valorpedido}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidosReprogramadosPage;
