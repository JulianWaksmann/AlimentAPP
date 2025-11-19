"use client"

import { useState } from "react"
import { PedidosAsignadosResponse } from "@/app/pages/logistica/inicio/pedidos-asignados/page"
import { verificarEntrega, verPedidos } from "@/app/api/logistica"
import Header from "../components/Header"

const EnviosPage = () => {
    const [verificado, setVerificado] = useState(false)
    const [dniTransportista, setDniTransportista] = useState("")
    const [pedidosAsignados, setPedidosAsignados] = useState<PedidosAsignadosResponse>() //estado "pendiente"
    const [pedidosDespachados, setPedidosDespachados] = useState<PedidosAsignadosResponse>() //estado "despachado"
    const [pedidosEntregados, setPedidosEntregados] = useState<PedidosAsignadosResponse>() //estado "entregada"
    const [cuilCliente, setCuilCliente] = useState("")
    const [activeTab, setActiveTab] = useState('asignados')
    const [modalError, setModalError] = useState<boolean>(false);

    async function consultarPedidos(){
        console.log("Consultando pedidos para DNI:", dniTransportista);
        try{
            const pedidosAsignadosResponse = await verPedidos(dniTransportista, "pendiente");
            setPedidosAsignados(pedidosAsignadosResponse);
            console.log("Pedidos Asignados:", pedidosAsignadosResponse);
            
            const pedidosDespachadosResponse = await verPedidos(dniTransportista, "despachado");
            setPedidosDespachados(pedidosDespachadosResponse);
            console.log("Pedidos Despachados:", pedidosDespachadosResponse);

            const pedidosEntregadosResponse = await verPedidos(dniTransportista, "entregado");
            setPedidosEntregados(pedidosEntregadosResponse);
            console.log("Pedidos Entregados:", pedidosEntregadosResponse);

            setVerificado(true);
        } catch (error) {
            console.error("Error al consultar el DNI:", error);
            setModalError(true);
        }
    }

    async function marcarEntregaPedido(idPedido: number){
        try{
            const response = await verificarEntrega(cuilCliente, idPedido);
            console.log(response);
            
        } catch (error) {
            console.error("Error al consultar el DNI:", error);
        }
    }


    return (
    <div>
        <Header/>
        <h1 className="text-2xl color-primary font-bold text-center mt-3">PEDIDOS</h1>
        <div className="rounded-lg bg-white p-3 w-full">
        {!verificado &&(
            <div className="flex flex-col items-center justify-center p-4  rounded-lg bg-white shadow-md w-full">
                <h2 className="text-2xl font-bold mb-4">Bienvenido</h2>
                <label className="mb-2">Ingrese su DNI para verificar</label>
                <input
                    className="border border-gray-300 rounded mb-4"
                    type="text"
                    value={dniTransportista}
                    onChange={(e) => setDniTransportista(e.target.value)}
                    placeholder="DNI"
                />
                <button onClick={() =>consultarPedidos()}
                className="rounded bg-success text-center p-3 text-white"
                >Ingresar</button>
            </div>
        )}
        {verificado && (
            <div>
                {/* TABS */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 justify-center" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('asignados')}
                            className={`${
                                activeTab === 'asignados'
                                    ? 'border-details text-details'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-medium`}
                        >
                           Asignados
                        </button>
                        <button
                            onClick={() => setActiveTab('despachados')}
                            className={`${
                                activeTab === 'despachados'
                                    ? 'border-details text-details'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-medium`}
                        >
                            Despachados
                        </button>
                        <button
                            onClick={() => setActiveTab('entregados')}
                            className={`${
                                activeTab === 'entregados'
                                    ? 'border-details text-details'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-medium`}
                        >
                           Entregados
                        </button>
                    </nav>
                </div>

                <div className="mt-4">
                    {activeTab === 'asignados' && (
                        <div>
                            <h2>Pedidos Asignados</h2>
                            {pedidosAsignados && pedidosAsignados.envios.length > 0 ? (
                                <ul>
                                    {pedidosAsignados.envios.map((pedido) => (
                                        <li key={pedido.id_envio}>
                                            Pedido ID: {pedido.id_envio} - Cliente: {pedido.razon_social}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay pedidos asignados.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'despachados' && (
                        <div>
                            <h2>Pedidos Despachados</h2>
                            {pedidosDespachados && pedidosDespachados.envios.length > 0 ? (
                                <ul>
                                    {pedidosDespachados.envios.map((pedido) => (
                                        <li key={pedido.id_envio}>
                                            Pedido ID: {pedido.id_envio} - Cliente: {pedido.razon_social}
                                            <button onClick={() => marcarEntregaPedido(pedido.id_envio)}>
                                                Marcar como Entregado
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay pedidos despachados.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'entregados' && (
                        <div>
                            <h2>Pedidos Entregados</h2>
                            {pedidosEntregados && pedidosEntregados.envios.length > 0 ? (
                                <ul>
                                    {pedidosEntregados.envios.map((pedido) => (
                                        <li key={pedido.id_envio}>
                                            Pedido ID: {pedido.id_envio} - Cliente: {pedido.razon_social}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay pedidos entregados.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
        </div>
        {modalError && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Error</h2>
                    <p className="mb-4">Por favor, verifique su DNI nuevamente.</p>
                    <button
                        onClick={() => setModalError(false)}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        )}
    </div>
    )
    }

export default EnviosPage

//ejemplo de llamada a la api
// """vehiculo"":
//   {
//     ""id_vehiculo"": ""12"",
//     ""patente"": ABC123,
//     ""tipo_unidad"": ""auto"",
//     ""modelo"": ""Volkswagen Gol"",
//     ""empresa"": ""LaRapida""
//     ""nombre_conductor"": ""Fernando"",
//     ""apellido_conductor"": ""Alonso"",
//     ""dni_conductor"": ""9127471"",
//     ""envios"": [
//       {
//         ""id_envio"": 13,
//         ""estado_envio"": ""pendiente"",
//         ""id_orden_venta"": 123,
//         ""id_cliente"": 45,
//         ""razon_social"": ""Comercial Los Andes S.A."",
//         ""email"": ""ventas@losandes.com"",
//         ""nombre_contacto"": ""Lucía"",
//         ""apellido_contacto"": ""Pérez"",
//         ""telefono"": ""1123456789"",
//         ""productos"": [
//           {
//             ""id"": 10,
//             ""nombre"": ""Hamburguesas x4"",
//             ""cantidad"": 4
//           },
//           {
//             ""id"": 12,
//             ""nombre"": ""Empanadas x12"",
//             ""cantidad"": 2
//           }
//         ],
//         ""fecha_despacho"" : null,
//         ""fecha_entrega_real"": null
//         ""fecha_pedido"": ""2025-10-30"",
//         ""fecha_entrega_solicitada"": ""2025-11-05"",
//         ""valor_total_pedido"": 187500.00,
//         ""peso_total_pedido"": 10.00 (kg)
//         ""direccion_entrega"": ""Av. Peron 1800, Buenos Aires, Argentina""
//       }
//     ]
//  }"