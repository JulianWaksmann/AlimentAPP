"use client";

import { useState } from "react";
import { PedidoCliente } from "../models/PedidosVentas";
import { getEstadoPedido } from "../api/pedidosVenta";
import Header from "../components/Header";


const ConsultarPedidoPage = () => {
  const [cuil, setCuil] = useState<string>("");
  const [pedidoId, setPedidoId] = useState<string>("");
  const [pedido, setPedido] = useState<PedidoCliente | null>(null);
  const [openModalPedido, setOpenModalPedido] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const ConsultarPedido = async () => {
    try {
      const response = await getEstadoPedido(cuil, pedidoId);
      console.log(response);
      setPedido(response);
      setOpenModalPedido(true)
    }
    catch (err : unknown) {
      let errorMsg = "Error desconocido";
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setModalMsg(errorMsg)
      setModalOpen(true);
    }
  };




  return (
    <div>
      
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-neutral-light">
      <h1 className="text-2xl font-bold mb-4">Consultar Pedido</h1>
      <p className="text-center">Aquí podrás consultar el estado de tu pedido ingresando tu número de pedido.</p>
      {/* Aquí puedes agregar un formulario o funcionalidad para consultar el pedido */}
      <div className="rounded bg-gray-400 p-4 mt-4 w-1/2">
        <div>
        <label className="block mb-2">Ingrese su DNI</label>
        <input type="text" id="dni" value={cuil} onChange={(e) => setCuil(e.target.value)} 
        className="w-full p-2 rounded border border-gray-300"/>
      </div>
      <div>
        <label htmlFor="" className="block mb-2">Ingrese su N° de Pedido</label>
        <input type="text" id="pedidoId" value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} 
        className="w-full p-2 rounded border border-gray-300"/>
      </div>
      <button className="mt-4 px-4 py-2 bg-details text-white rounded hover:bg-details-dark"
      onClick={() => ConsultarPedido()}
      >
        Consultar Pedido
      </button>
      </div>
            {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="rounded-lg p-6 shadow-lg w-80 text-center bg-red-50 border border-red-300">
            <h3 className="text-lg font-bold mb-2 text-red-600">Error</h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded font-semibold bg-red-600 text-white hover:opacity-90 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {openModalPedido && pedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="rounded-lg p-6 shadow-lg w-96 text-start bg-white border border-gray-300">
            <h3 className="text-lg font-bold mb-2">Estado del Pedido</h3>
            <p className="mb-4 text-sm">ID Pedido: #{pedido.id_pedido_venta}</p>
            <p className="mb-4 text-sm">Estado: {pedido.estado_pedido}</p>
            <p className="mb-4 text-sm">Fecha de Creación: {new Date(pedido.fecha_pedido).toLocaleDateString()}</p>
            <p className="mb-4 text-sm">Fecha de entrega Solicitada: {new Date(pedido.fecha_entrega_solicitada).toLocaleDateString()}</p>
            {pedido.productos.map((producto) => (
              <div key={producto.id_producto} className="mb-2 flex justify-between border-b border-gray-200 pb-2">
                <p className="text-sm font-semibold">{producto.nombre}</p>
                <p className="text-sm">Cantidad: {producto.cantidad}</p>
              </div>
            ))}

            <button onClick={() => setOpenModalPedido(false)} className="px-4 py-2 rounded font-semibold bg-blue-600 text-white hover:opacity-90 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
 </div>
  );
};

export default ConsultarPedidoPage;