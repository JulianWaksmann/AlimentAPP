"use client";
import Header from "@/app/components/Header";
// import { Tanda } from "@/app/models/Tanda";
// import {  useEffect, useState } from "react";
// import { GetTandas } from "@/app/api/tandas";
import TandasTable from "@/app/components/TandasTable";
import Tandas from "@/app/components/Tandas";
import { UpdateEstadoTandaProduccion } from "@/app/api/tandas";


const TandasSupegidasPage = () => {
  // const [tandasSugeridas, setTandasSugeridas] = useState<Tanda[]>([]);

  // const handleActualizar = async () => {
  //   const data = await GetTandas("planificada");
  //   setTandasSugeridas(data);
  // };

  // useEffect(() => {
  //   const fetchTandasSugeridas = async () => {
  //     const data = await GetTandas("planificada");
  //         console.log(data);

  //     setTandasSugeridas(data);
  //   };
  //   fetchTandasSugeridas();
  // }, []);
  const cambiarEstado = async (ids_tandas: number[]) => {
    console.log("Cambiando estado de las tandas: ", ids_tandas);
    try {
    await UpdateEstadoTandaProduccion(ids_tandas, "en_progreso");
  } catch (error) {
    console.error("Error al actualizar el estado de las tandas: ", error);
    throw error;
  }
  }
  return (
    <div>
      <Header />
      <h1 className="text-xxl font-bold text-center my-3">Tandas Sugeridas por Optimización</h1>
      {/* <button className="rounded bg-primary px-4 py-2 text-white transition hover:opacity-90" 
      onClick={handleActualizar}
      >Actualizar</button> */}
      <div>
        {/* <TandasTable estadoActual="planificada" estadoNuevo="en_progreso" /> */}
        <Tandas estadoOP="planificada" cambiarEstado={cambiarEstado} />
        </div>
    </div>
  );
};

export default TandasSupegidasPage;

