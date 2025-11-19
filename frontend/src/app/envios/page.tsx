"use client"

import { useState } from "react"
import { PedidosAsignadosResponse } from "@/app/pages/logistica/inicio/pedidos-asignados/page"
import { verificarEntrega, verPedidos } from "@/app/api/logistica"
import Header from "../components/Header"
import Mapa, { ApiData } from "../components/Mapa"

const EnviosPage = () => {
    const [verificado, setVerificado] = useState(false)
    const [dniTransportista, setDniTransportista] = useState("")
    const [pedidosAsignados, setPedidosAsignados] = useState<PedidosAsignadosResponse>() //estado "pendiente"
    const [pedidosDespachados, setPedidosDespachados] = useState<PedidosAsignadosResponse>() //estado "despachado"
    const [pedidosEntregados, setPedidosEntregados] = useState<PedidosAsignadosResponse>() //estado "entregada"
    const [cuilCliente, setCuilCliente] = useState("")
    const [activeTab, setActiveTab] = useState('asignados')
    const [modalError, setModalError] = useState<boolean>(false);
    const [modalVerificarCliente, setModalVerificarCliente] = useState<boolean>(false);
    const [idPedidoAEntregar, setIdPedidoAEntregar] = useState<number>(0);
    const [modalErrorDNI, setModalErrorDNI] = useState<boolean>(false);
    const [verMapa, setVerMapa] = useState<boolean>(false);

    const mockData: ApiData = {
      "count": 4,
      "ordered_points": [
        {"sequence":1,"id_orden":199,"lat":-34.521667, "lon":-58.701182},
        {"sequence":2,"id_orden":201,"lat":-34.498857,"lon":-58.677598},
        {"sequence":3,"id_orden":202,"lat":-34.481442,"lon":-58.669840},
        {"sequence":4,"id_orden":203,"lat":-34.459143,"lon":-58.682599}
      ]
    };
    async function consultarPedidos(){
        console.log("Consultando pedidos para DNI:", dniTransportista);
        try{
            const pedidosAsignadosResponse = await verPedidos(dniTransportista, "pendiente");
            console.log(pedidosAsignadosResponse);
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
            console.log("Error al consultar el DNI:", error);
            // console.error("Error al consultar el DNI:", error);
            setModalError(true);
        }
    }

    async function marcarEntregaPedido(idPedido: number){
        try{
            const response = await verificarEntrega(cuilCliente, idPedido);
            console.log(response);
            consultarPedidos();

            
        } catch (error) {
            console.error("Error al consultar el DNI:", error);
            setModalErrorDNI(true);
        }
    }


    return (
    <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-2xl text-gray-800 font-extrabold text-center mb-4">Pedidos</h1>

            <section className="bg-white rounded-lg shadow-sm p-4">
                {!verificado && (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white shadow-md w-full p-6">
                        <h2 className="text-2xl font-semibold">Bienvenido</h2>
                        <p className="text-sm text-gray-500">Ingrese su DNI para ver los pedidos asignados</p>

                        <div className="w-full sm:w-3/4">
                            <label className="sr-only">DNI</label>
                            <input
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                type="text"
                                value={dniTransportista}
                                onChange={(e) => setDniTransportista(e.target.value)}
                                placeholder="DNI"
                            />
                        </div>

                        <div className="w-full sm:w-3/4 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => consultarPedidos()}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm"
                            >
                                Ingresar
                            </button>
                            <button
                                onClick={() => { setDniTransportista(''); setModalError(false); }}
                                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                )}

                {verificado && (
                    <div>
                        {/* Tabs */}
                        <div className="mt-2">
                            <nav className="flex space-x-2 justify-center" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('asignados')}
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'asignados' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Asignados
                                </button>
                                <button
                                    onClick={() => setActiveTab('despachados')}
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'despachados' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Despachados
                                </button>
                                <button
                                    onClick={() => setActiveTab('entregados')}
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'entregados' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Entregados
                                </button>
                            </nav>
                        </div>

                        <div className="mt-6 space-y-4">
                            {activeTab === 'asignados' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pedidos Asignados</h3>
                                    {pedidosAsignados && pedidosAsignados.envios != null ? (
                                        <ul className="space-y-3">
                                            {pedidosAsignados.envios.map((pedido) => (
                                                <li key={pedido.id_envio} className="bg-gray-50 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">Pedido #{pedido.id_orden_venta}</p>
                                                        <p className="text-xs text-gray-500">{pedido.razon_social}</p>
                                                    </div>
                                                    <div className="text-xs text-gray-400">Estado: pendiente</div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay pedidos asignados.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'despachados' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pedidos Despachados</h3>
                                    <button onClick={() => setVerMapa(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm">Ver Mapa</button>
                                    {pedidosDespachados && pedidosDespachados.envios != null ? (
                                        <ul className="space-y-3">
                                            {pedidosDespachados.envios.map((pedido) => (
                                                <li key={pedido.id_envio} className="bg-white p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">Pedido #{pedido.id_orden_venta}</p>
                                                        <p className="text-xs text-gray-500">{pedido.razon_social}</p>
                                                        {/* Dirección no disponible en el tipo de pedido; omitir campo */}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setModalVerificarCliente(true); setIdPedidoAEntregar(pedido.id_envio); }}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm"
                                                        >
                                                            Marcar como Entregado
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay pedidos despachados.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'entregados' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pedidos Entregados</h3>
                                    {pedidosEntregados && pedidosEntregados.envios != null ? (
                                        <ul className="space-y-3">
                                            {pedidosEntregados.envios.map((pedido) => (
                                                <li key={pedido.id_envio} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">Pedido #{pedido.id_orden_venta}</p>
                                                        <p className="text-xs text-gray-500">{pedido.razon_social}</p>
                                                    </div>
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Entregado</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay pedidos entregados.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </main>

        {/* Modal: Verificar Cliente */}
        {modalVerificarCliente && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 px-4">
                <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-2">Verificar Cliente</h2>
                    <p className="text-sm text-gray-500 mb-4">Ingrese el CUIL del cliente para confirmar la entrega.</p>
                    <input
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        type="text"
                        value={cuilCliente}
                        onChange={(e) => setCuilCliente(e.target.value)}
                        placeholder="CUIL Cliente"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { marcarEntregaPedido(idPedidoAEntregar); setModalVerificarCliente(false); setCuilCliente(''); setIdPedidoAEntregar(0); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                        >
                            Verificar y Marcar
                        </button>
                        <button
                            onClick={() => { setModalVerificarCliente(false); setCuilCliente(''); setIdPedidoAEntregar(0); }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Error */}
        {modalError && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 px-4">
                <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-2">Error</h2>
                    <p className="text-sm text-gray-600 mb-4">Por favor, verifique su DNI nuevamente.</p>
                    <div className="flex justify-end">
                        <button
                            onClick={() => setModalError(false)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        )}
        {modalErrorDNI && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 px-4">
                <div className="bg-white w-full max-w-sm rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-2">Error</h2>
                    <p className="text-sm text-gray-600 mb-4">Por favor, verifique su DNI nuevamente.</p>
                    <div className="flex justify-end">
                        <button
                            onClick={() => setModalErrorDNI(false)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        )}


        {/* Modal: Ver Mapa */}
        {verMapa && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 px-4">
                <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-2">Mapa de Entregas</h2>
                    <div className="w-full h-96 mb-4">
                        {/* Aquí puedes integrar un mapa real usando una librería como Leaflet o Google Maps */}
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            {/* <p className="text-gray-500">[Mapa Placeholder]</p> */}

                            <Mapa data={mockData} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        
                        <button
                            onClick={() => setVerMapa(false)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    )
    }

export default EnviosPage
