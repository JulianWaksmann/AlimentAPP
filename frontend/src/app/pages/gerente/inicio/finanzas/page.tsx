"use client";
import { Ganancias_total, Ingreso_Costos_Ganancias } from "@/app/api/graficos";
import FinanzasStack from "@/app/components/graficos/Finanzas";
import GananciasChart from "@/app/components/graficos/Ganancias";
import Header from "@/app/components/Header";
import { Finanza } from "@/app/models/Graficos";
import { useEffect, useState } from "react";

const FinanzasPage = () => {
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [gananciasTotales, setGananciasTotales] = useState<Finanza[]>([]);
//   const [produccionDiaria, setProduccionDiaria] = useState<EficienciaProduccion[]>([]);
//   const [pedidos, setPedidos] = useState<PedidosEntregados[]>([]);

  // Estado para mes y año
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1); // Mes actual (1-12)
  const [anio, setAnio] = useState<number>(new Date().getFullYear()); // Año actual

  useEffect(() => {
    async function fetchFinanzas() {
      const ganancias = await Ganancias_total();
      setGananciasTotales(ganancias);
      console.log(ganancias);


    //   const dataPedidos = await pedidosEntregados();
    //   setPedidos(dataPedidos);

    //   const produccion = await Produccion_total_por_dia();
    //   setProduccionDiaria(produccion);
    //   console.log(produccion);


      const data = await Ingreso_Costos_Ganancias(mes, anio);
      setFinanzas(data);
    }
    fetchFinanzas();
  }, [mes, anio]);

  return (
    <div>
      <Header />
        <h1 className="text-3xl mt-2 font-bold text-primary mb-4 text-center">FINANZAS</h1>
      <div className="p-6 w-full h-full border-b border-gray-300 mb-6  ">
             {/* Select para Mes */}
      <div className="flex justify-center mb-4">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="mr-4">
          {[...Array(12)].map((_, index) => (
            <option key={index} value={index + 1}>
              {index + 1} {/* Muestra el mes como número (1-12) */}
            </option>
          ))}
        </select>

        {/* Select para Año */}
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {[2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
        <h2 className="text-2xl font-bold text-primary mb-4 text-center">
          Ingresos y Costos por Fecha
        </h2>
        <FinanzasStack finanzas={finanzas} />
      </div>
      <div className="p-6 w-full h-full bg-white-light  border-b border-gray-300 mb-6 ">
        <h2 className="text-2xl font-bold text-primary mb-4 text-center">
          Ganancias por fecha
        </h2>

        <GananciasChart Finanza={gananciasTotales} />
      </div>
      {/* <div className="p-6 w-full h-full bg-white-light  border-b border-gray-300 mb-6 ">
                <h2 className="text-2xl font-bold text-primary mb-4 text-center">
          Cantidad de bultos producidos por día
        </h2>
        <ProducionGrafico data={produccionDiaria}/>
      </div> */}
            {/* <div className="p-6 w-full h-full bg-white-light  border-b border-gray-300 mb-6 ">
                <h2 className="text-2xl font-bold text-primary mb-4 text-center">
          Pedidos entregados por dia
        </h2>
        <PedidosEntregadosGrafico data={pedidos}/>
      </div> */}
    </div>
  );
};

export default FinanzasPage;
