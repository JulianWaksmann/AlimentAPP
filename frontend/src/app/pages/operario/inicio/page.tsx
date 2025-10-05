"use client";
import Header from "@/app/components/Header";
import React, { useEffect, useState } from "react";
import { OrdenProduccion } from "@/app/models/OrdenProduccion";
import { GetOrdenesProduccion } from "@/app/api/produccion";
import OrdenesDeProduccionTable from "@/app/components/OrdenesDeProduccionTable";


const OperarioInicioPage = () => {
      const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);

        useEffect(() => {
          async function fetchOrdenes() {
            const res = await GetOrdenesProduccion();
            setOrdenes(res);
            // console.log(res);
          }
          fetchOrdenes();
        }, []);
    
  return <div>

    <Header></Header>
        <main className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Panel Operario</h2>
      <div className="flex items-center p-6 bg-white border-b border-details">
        <OrdenesDeProduccionTable ordenes={ordenes} />
      </div>
    </main>
  </div>;
};

export default OperarioInicioPage;