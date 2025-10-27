"use client";
import Header from "@/app/components/Header";
import { Tanda } from "@/app/models/Tanda";
import {  useEffect, useState } from "react";
import { GetTandas } from "@/app/api/tandas";
import TandasTable from "@/app/components/TandasTable";

const TandasSupegidasPage = () => {
  const [tandasSugeridas, setTandasSugeridas] = useState<Tanda[]>([]);

  useEffect(() => {
    const fetchTandasSugeridas = async () => {
      const data = await GetTandas("planificada");
      setTandasSugeridas(data);
    };
    fetchTandasSugeridas();
  }, []);

  return (
    <div>
      <Header />
      <h1 className="text-xxl font-bold text-center my-3">Tandas Sugeridas por Optimización</h1>
      <div>
        <TandasTable tandas={tandasSugeridas} estado="en_progreso" />
        </div>
    </div>
  );
};

export default TandasSupegidasPage;
