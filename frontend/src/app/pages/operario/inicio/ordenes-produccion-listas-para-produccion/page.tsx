"use client";
import React, { useState } from "react";
import Header from "@/app/components/Header";
import { getOrdenesDeProduccionEnEstado, UpdateEstadoOrdenProduccion } from "@/app/api/produccion";
import { OrdenProduccion } from "@/app/models/OrdenProduccion";
import TablaOrdenesDeTrabajo from "@/app/components/TablaOrdenesDeTrabajo";
const PageOrdenesProduccionListasParaProduccion = () => {
    const [ordenesListas, setOrdenesListas] = useState<OrdenProduccion[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getOrdenesDeProduccionEnEstado("lista_para_produccion");
                setOrdenesListas(response);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);


    const handleCambiarEstado = async (id: number) => {
        try {
            await UpdateEstadoOrdenProduccion(id, "en_proceso");
            setOrdenesListas((prev) => prev.filter(o => o.id_orden_produccion !== id));
        } catch (error) {
            console.error("Error actualizando estado:", error);
        }
    };

    return (
        <div>
            <Header />
            <div className="text-lg font-bold mb-2">Ordenes de Producción Listas para Producción</div>
            <TablaOrdenesDeTrabajo
                ordenes={ordenesListas}
                estadoSiguiente="en_proceso"
                onCambiarEstado={handleCambiarEstado}
            />
        </div>
    );
};

export default PageOrdenesProduccionListasParaProduccion;