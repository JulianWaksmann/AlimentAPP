"use client";

import React, { useEffect, useState } from "react";
import { GetPedidosVenta } from "@/app/api/pedidosVenta";
import { PedidosVentas } from "@/app/models/PedidosVentas";
import PedidoVenta from "@/app/components/PedidoDeVenta";


const GestionVentasPage = () => {
  const [pedidos, setPedidos] = useState<PedidosVentas[]>([]);

  

  useEffect(() => {
    async function fetchPedidos() {
      const res = await GetPedidosVenta();
      setPedidos(res);
      // console.log(res);
    };
    fetchPedidos();
  }, []);
    



  return (
    <div className="min-h-screen bg-neutral-light p-6 space-y-6">



      <PedidoVenta pedidos={pedidos} />
    </div>
  );
};

export default GestionVentasPage;
