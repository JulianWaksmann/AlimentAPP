"use client";
import React, { useEffect, useState } from "react";
import { pedidosEntregados } from "@/app/api/graficos";
import { PedidosEntregados } from "@/app/models/Graficos";
import PedidosEntregadosGrafico from "@/app/components/graficos/PedidosEntregados";
import Header from "@/app/components/Header";

const PedidosPageGerente = () => {
  const [pedidos, setPedidos] = useState<PedidosEntregados[]>([]);
  // Estado para mes y año
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1); // Mes actual (1-12)
  const [anio, setAnio] = useState<number>(new Date().getFullYear()); // Año actual
  useEffect(() => {
    async function fetchPedidos() {
      const dataPedidos = await pedidosEntregados(mes,anio);
      setPedidos(dataPedidos);
    }
    fetchPedidos();
  }, [mes,anio]);

  return (
    <div className="w-full">
        <Header />
      <h1 className="text-3xl mt-2 font-bold text-primary mb-4 text-center">
        PEDIDOS DE MATERIA PRIMA
      </h1>
      {/* Aquí iría el componente de tabla de pedidos de materia prima */}
      <div className="p-6 w-full h-full bg-white-light  border-b border-gray-300 mb-6 ">
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
          Pedidos entregados por dia
        </h2>
        <PedidosEntregadosGrafico data={pedidos} />
      </div>
    </div>
  );
};

export default PedidosPageGerente;
