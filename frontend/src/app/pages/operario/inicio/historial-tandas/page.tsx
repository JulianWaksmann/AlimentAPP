"use client";
import { GetTandas } from "@/app/api/tandas";
import { Tanda } from "@/app/models/Tanda";
import { useEffect, useState } from "react";
import TandasHistorial from "@/app/components/TandasHistorial";
import Header from "@/app/components/Header";


const HistorialTandasPage = () => {
    const [tandas, setTandas] = useState<Tanda[]> ([]);

    useEffect(() => {
        const fetchTandas = async () => {
            // const tandasPlanificadas = await GetTandas("planificada");
            const tandasEnProgreso = await GetTandas("en_progreso");
            const tandasCompletadas = await GetTandas("completada");
            setTandas([...tandasEnProgreso, ...tandasCompletadas]);
        };
        fetchTandas();
    }, []); 

    return (
        <div >
            <Header />
            <h1 className="text-2xl font-bold mb-4 text-center pt-4 text-primary ">Historial de Tandas</h1>
            <TandasHistorial tandas={tandas} />
        </div>
    );
};

export default HistorialTandasPage;