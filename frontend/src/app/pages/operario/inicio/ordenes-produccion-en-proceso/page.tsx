"use client";
import React, { useState } from "react";
import Header from "@/app/components/Header";
import { getOrdenesDeProduccionEnEstado, UpdateEstadoOrdenProduccion } from "@/app/api/produccion";
import { OrdenProduccion } from "@/app/models/OrdenProduccion";
import TablaOrdenesDeTrabajo from "@/app/components/TablaOrdenesDeTrabajo";
const PageOrdenesProduccionEnProceso = () => {
    const [ordenesEnProceso, setOrdenesEnProceso] = useState<OrdenProduccion[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getOrdenesDeProduccionEnEstado("en_proceso");
                setOrdenesEnProceso(response);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);


    const handleCambiarEstado = async (id: number) => {
        try {
            await UpdateEstadoOrdenProduccion(id, "en_proceso");
            setOrdenesEnProceso((prev) => prev.filter(o => o.id_orden_produccion !== id));
        } catch (error) {
            console.error("Error actualizando estado:", error);
        }
    };

    return (
        <div>
            <Header />
            <div className="text-lg font-bold mb-2">Ordenes de Producción En Proceso</div>
            <TablaOrdenesDeTrabajo
                ordenes={ordenesEnProceso}
                estadoSiguiente="finalizada"
                onCambiarEstado={handleCambiarEstado}
            />
        </div>
    );
};

export default PageOrdenesProduccionEnProceso;