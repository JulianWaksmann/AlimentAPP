"use client";
import Header from "@/app/components/Header";
import { Tanda } from "@/app/models/Tanda";
import {  useEffect, useState } from "react";
import { GetTandas, UpdateEstadoTandaProduccion } from "@/app/api/tandas";
import TandasTable from "@/app/components/TandasTable";
import Tandas from "@/app/components/Tandas";

const TandasEnProgresoPage = () => {
  // const [tandasEnProceso, setTandasEnProceso] = useState<Tanda[]>([]);

  // useEffect(() => {
  //   const fetchTandasEnProceso = async () => {
  //     const data = await GetTandas("en_progreso");
  //     setTandasEnProceso(data);
  //   };
  //   fetchTandasEnProceso();
  // }, []);


  const cambiarEstado = async (ids_tandas: number[]) => {
    console.log("Cambiando estado de las tandas: ", ids_tandas);
  try {
    await UpdateEstadoTandaProduccion(ids_tandas, "completada");
  } catch (error) {
    console.error("Error al actualizar el estado de las tandas: ", error);
    throw error;
  }
  }
  return (
    <div>
      <Header />
      <h1 className="text-xxl font-bold text-center my-3">Tandas En Progreso</h1>
      <div>
        {/* <TandasTable estadoActual="en_progreso" estadoNuevo="completada" /> */}
        <Tandas estadoOP="en_progreso" cambiarEstado={cambiarEstado} />
        </div>
    </div>
  );
};

export default TandasEnProgresoPage;
