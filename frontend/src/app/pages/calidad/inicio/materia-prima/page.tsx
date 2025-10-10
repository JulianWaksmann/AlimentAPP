import Header from "@/app/components/Header";
import React, { useEffect, useState } from "react";
import { PedidoMateriaPrima } from "@/app/models/PedidoMateriaPrima";
import { getAllPedidosMateriaPrima } from "@/app/api/materiaPrima";

const MateriaPrimaPage = () => {
  const [pedidos, setPedidos] = useState<PedidoMateriaPrima[]>([]);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await getAllPedidosMateriaPrima();
        setPedidos(response);
      } catch (error) {
        console.error("Error fetching pedidos de materia prima:", error);
      }
    };
    fetchPedidos();
  }, []);

  return (<div className="min-h-screen bg-neutral-light">
    <Header />
    <main className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Materia prima</h2>
      
    </main>
  </div>
)};

export default MateriaPrimaPage;
