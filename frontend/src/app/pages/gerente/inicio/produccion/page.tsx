"use client";
import React, { useEffect, useState } from "react";
import { Produccion_total_por_dia } from "@/app/api/graficos";
import { EficienciaProduccion } from "@/app/models/Graficos";
import ProducionGrafico from "@/app/components/graficos/Produccion";
import Header from "@/app/components/Header";
const ProduccionPageGerente = () => {
      const [produccionDiaria, setProduccionDiaria] = useState<EficienciaProduccion[]>([]);

        useEffect(() => {
          async function fetchProduccion() {

      const produccion = await Produccion_total_por_dia();
      setProduccionDiaria(produccion);
            }
            fetchProduccion();
          }, []);

    return (
        <div>
          <Header />
            <h1 className="text-3xl mt-2 font-bold text-primary mb-4 text-center">PRODUCCIÓN</h1>

        <div className="p-6 w-full h-full bg-white-light  border-b border-gray-300 mb-6 ">
                <h2 className="text-2xl font-bold text-primary mb-4 text-center">
          Cantidad de bultos producidos por día
        </h2>
        <ProducionGrafico data={produccionDiaria}/>
      </div>
        </div>
    );
};
export default ProduccionPageGerente;