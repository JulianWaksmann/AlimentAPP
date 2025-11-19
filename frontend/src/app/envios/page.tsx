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

    async function consultarPedidos(){
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

        } catch (error) {
            console.error("Error al consultar el DNI:", error);
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

        <div className="rounded-lg bg-white p-6 w-full">
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
                {/* Aquí puedes agregar el contenido que se mostrará cuando el usuario esté verificado */}
                <div>
                    { /* Renderizar pedidos asignados */}
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

                    { /* Renderizar pedidos despachados */}
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
                    

                    { /* Renderizar pedidos entregados */}                                        
                                        
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
                </div>

            </div>
        )}
        </div>
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