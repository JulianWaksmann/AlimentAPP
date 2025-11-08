"use client"
import { Producto } from '@/app/models/Producto';
import { useEffect, useState, useCallback } from 'react';
import { GetPedidosAsignados, updateEstadoEnvio } from '@/app/api/pedidosVenta';
import Header from '@/app/components/Header';

export type PedidosAsignadosResponse = {
    // flota: Flota;
    id_vehiculo: number;
    patente: string;
    tipo_unidad: string;
    modelo: string;
    empresa: string;
    nombre_conductor: string;
    apellido_conductor: string;
    dni_conductor: string;
    envios: {
        id_envio: number;
        estado_envio: string;
        id_orden_venta: number;
        id_cliente: number;
        razon_social: string;
        email: string;
        nombre_contacto: string;
        apellido_contacto: string;
        telefono: string;
        productos: Producto[];
        fecha_despacho: string | null;
        fecha_entrega_real?: string | null;
        fecha_pedido: string;
        fecha_entrega_solicitada: string | null;
        valor_total_pedido: number;
        peso_total_pedido: number;
    }[];
}


const PedidosAsignadosPage = () => {
    const [pedidosAsignados, setPedidosAsignados] = useState<PedidosAsignadosResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPedidosAsignados = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await GetPedidosAsignados("pendiente");
            setPedidosAsignados(response || []);
        } catch (err) {
            setError("Error al cargar los pedidos asignados. Intente de nuevo.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPedidosAsignados();
    }, [fetchPedidosAsignados]);

    const handleDespachar = async (flotaId: number) => {
        try {
            await updateEstadoEnvio(flotaId);
            await fetchPedidosAsignados();
        } catch (err) {
            setError("Error al actualizar el estado del envío. Intente de nuevo.");
            console.error(err);
        }
    };

    return (
        <div>
            <Header />
            <div className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-2xl font-bold mb-6 text-center">Pedidos Asignados para Despacho</h1>

                {loading && <p className="text-center text-gray-500">Cargando...</p>}
                {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

                {!loading && !error && pedidosAsignados.length === 0 && (
                    <p className="text-center text-gray-600 mt-8">No hay pedidos asignados pendientes de despacho.</p>
                )}

                <div className="space-y-8">
                    {pedidosAsignados.map((envio) => (
                        <div key={envio.id_vehiculo} className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">{envio.modelo} - {envio.patente}</h2>
                                    <p className="text-sm text-gray-300">{envio.nombre_conductor} {envio.apellido_conductor}</p>
                                    <p className="text-sm text-gray-300">DNI: {envio.dni_conductor}</p>
                                    <p className="text-sm text-gray-300">Empresa: {envio.empresa}</p>
                                </div>
                                <button 
                                    onClick={() => handleDespachar(envio.id_vehiculo!)}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50"
                                    disabled={!envio.id_vehiculo}
                                >
                                    DESPACHAR
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Pedidos en este envío:</h3>
                                {envio.envios.map(pedido => (
                                    <div key={pedido.id_orden_venta} className="p-3 bg-gray-50 rounded-lg">
                                        <p className="font-semibold text-gray-800">Pedido #{pedido.id_orden_venta} - {pedido.razon_social}</p>
                                        <p className="text-m text-green-900">Valor total: ${pedido.valor_total_pedido.toFixed(2)}</p>
                                        <p className="text-sm text-gray-600">Fecha de entrega solicitada: {pedido.fecha_entrega_solicitada}</p>
                                        <p className="text-sm text-gray-600">Email: {pedido.email}</p>
                                        <p className="text-sm text-gray-600">Teléfono: {pedido.telefono}</p>
                                        <p className="text-sm text-gray-600">Peso: {pedido.peso_total_pedido} kg</p>
                                        <div className="mt-2">
                                            <h4 className="font-medium text-gray-700">Productos:</h4>
                                            <ul className="list-disc list-inside">
                                                {pedido.productos.map(producto => (
                                                    <li key={producto.id} className="text-sm text-gray-600">
                                                        {producto.nombre} - Bultos: {producto.cantidad}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PedidosAsignadosPage;