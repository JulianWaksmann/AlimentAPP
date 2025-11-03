"use client";
import Header from "@/app/components/Header";
import { planificacion } from "@/app/models/Tanda";
import React, { useEffect, useState } from "react";
import { getPlanificacionData } from "@/app/api/tandas";
import Calendario from "@/app/components/Calendario";



const PlanificacionPage = () => {
  const [planificacionData, setPlanificacionData] = useState<planificacion[]>([]);

  useEffect(() => {
    async function fetchPlanificacionData() {
      const response = await getPlanificacionData();
      console.log(response);
      setPlanificacionData(response);
    }
    fetchPlanificacionData();
  }, []);

  // Transforma el array de objetos en un solo objeto compatible con el Calendario
  const planificacionParaCalendario = planificacionData.reduce((acc, current) => {
    return { ...acc, ...current };
  }, {});

  return(
  <div className="min-h-screen bg-neutral-light">
    <Header />

    <Calendario planificacion={planificacionParaCalendario} />


  </div>
  )
};

export default PlanificacionPage;
