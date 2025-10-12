"use client";
import React, { useState } from "react";
import Header from "@/app/components/Header";
import { getOrdenesDeProduccionEnEstado, UpdateEstadoOrdenProduccion } from "@/app/api/produccion";
import { OrdenProduccion } from "@/app/models/OrdenProduccion";
import TablaOrdenesDeTrabajo from "@/app/components/TablaOrdenesDeTrabajo";
const PageOrdenesProduccionFinalizadas= () => {
    const [ordenesFinalizadas, setOrdenesFinalizadas] = useState<OrdenProduccion[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getOrdenesDeProduccionEnEstado("finalizada");
                setOrdenesFinalizadas(response);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);


    const handleCambiarEstado = async (id: number) => {
        try {
            await UpdateEstadoOrdenProduccion(id, "");
            setOrdenesFinalizadas((prev) => prev.filter(o => o.id_orden_produccion !== id));
        } catch (error) {
            console.error("Error actualizando estado:", error);
        }
    };

    return (
        <div>
            <Header />
            <div className="text-lg font-bold mb-2">Ordenes de Producción Finalizadas</div>
            <TablaOrdenesDeTrabajo
                ordenes={ordenesFinalizadas}
                // estadoSiguiente=""
                onCambiarEstado={handleCambiarEstado}
            />
        </div>
    );
};

export default PageOrdenesProduccionFinalizadas;