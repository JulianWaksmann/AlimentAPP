"use client";
import Header from "@/app/components/Header";
import { Tanda } from "@/app/models/Tanda";
import {  useEffect, useState } from "react";
import { GetTandas } from "@/app/api/tandas";
import TandasTable from "@/app/components/TandasTable";

const TandasEnProgresoPage = () => {
  const [tandasEnProceso, setTandasEnProceso] = useState<Tanda[]>([]);

  useEffect(() => {
    const fetchTandasEnProceso = async () => {
      const data = await GetTandas("en_progreso");
      setTandasEnProceso(data);
    };
    fetchTandasEnProceso();
  }, []);

  return (
    <div>
      <Header />
      <h1 className="text-xxl font-bold text-center my-3">Tandas En Progreso</h1>
      <div>
        <TandasTable tandas={tandasEnProceso} estado="completada" />
        </div>
    </div>
  );
};

export default TandasEnProgresoPage;
