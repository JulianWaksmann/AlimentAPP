"use client";
import Header from "@/app/components/Header";
import { useEffect, useState } from "react";
import { getPedidosRetiro } from "@/app/api/logistica";
import { PedidoRetiro } from "@/app/models/PedidosVentas"
import { entregarPedido } from "@/app/api/logistica";



const PedidosRetiroPage = () => {

    const [pedidosRetiro, setPedidosRetiro]  = useState<PedidoRetiro[]>([]);
    const [confirmarEntrega, setConfirmarEntrega] = useState<boolean>(false);
    const [IdPedidoSeleccionado, setIdPedidoSeleccionado] = useState<number | null>(null);
    
    useEffect(() => {
        async function fetchPedidosRetiro() {
            try {
                const response = await getPedidosRetiro();
                console.log(response);
                setPedidosRetiro(response || []);
            } catch (error) {
                console.error("Error al cargar los pedidos para retiro:", error);
            }
        }
        fetchPedidosRetiro();
    }, []);

    async function marcarEntrega() {

        await entregarPedido(IdPedidoSeleccionado!);
        window.location.reload();
    }


    return (
        <div>
            <Header></Header>

        <h1 className="text-center text-primary text-3xl my-2 font-semibold">Pedidos Para Retiro</h1>   
        <div className="p-4 sm:p-6 lg:p-8">
            {pedidosRetiro.length === 0 ? (
                <p className="text-center">No hay pedidos para retiro disponibles.</p>
            ) : (
                <div className="grid gap-6">
                    {pedidosRetiro.map((pedido) => (
                        <div key={pedido.id_pedido_venta} className="border p-4 rounded-lg shadow-sm bg-white">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-semibold mb-1">Pedido ID: {pedido.id_pedido_venta}</h3>
                                <button className="rounded bg-details p-2 "
                                // onClick={() => marcarEntrega(pedido.id_pedido_venta)}
                                onClick={() =>  {setConfirmarEntrega(true); setIdPedidoSeleccionado(pedido.id_pedido_venta);}}>
                                    Marcar Entrega
                                </button>
                            </div>
                            <h2 className="text-xl font-bold mb-2">{pedido.razon_social}</h2>
                            <p><strong>Contacto:</strong> {pedido.nombre_contacto} {pedido.apellido_contacto}</p>
                            <p><strong>Email:</strong> {pedido.email}</p>
                            <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                            <p><strong>Fecha de Pedido:</strong> {new Date(pedido.fecha_pedido).toLocaleDateString()}</p>
                            <p><strong>Fecha Entrega Solicitada:</strong> {new Date(pedido.fecha_entrega_solicitada).toLocaleDateString()}</p>

                            <p><strong>Valor Total del Pedido:</strong> ${pedido.valor_total_pedido}</p>
                            <p><strong>Peso Total del Pedido:</strong> {pedido.peso_total_kg} kg</p>
                            <div className="mt-4">
                                <h3 className="font-semibold mb-2">Productos:</h3>
                                <ul className="list-disc list-inside">
                                    {pedido.productos.map((producto) => (
                                        <li key={producto.id_producto}>
                                            {producto.nombre_producto} - Cantidad: {producto.cantidad}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        {confirmarEntrega && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Confirmar Entrega</h2>
                    <p className="mb-4">¿Estás seguro que deseas marcar el pedido #{IdPedidoSeleccionado} como entregado?</p>
                    <div className="flex justify-end">
                        <button
                            className="bg-red-500 text-white px-4 py-2 rounded-lg mr-2"
                            onClick={() => setConfirmarEntrega(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            className="bg-green-600 text-white px-4 py-2 rounded-lg"
                            onClick={() => {
                                marcarEntrega();
                                setConfirmarEntrega(false);
                            }}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    )
}

export default PedidosRetiroPage;