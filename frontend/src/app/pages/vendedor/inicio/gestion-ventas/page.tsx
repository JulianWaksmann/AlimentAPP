"use client";

import React, { useEffect, useState } from "react";
import pedidosData from "@/data/pedidosVenta.json";
import PedidoVentaTable, { PedidoVenta, Producto, EstadoPedido } from "@/app/components/PedidoDeVenta";


const GestionVentasPage = () => {
  // const pedidosIniciales: PedidoVenta[] = pedidosData.map((pedido) => ({
  //   ...pedido,
  //   estado: pedido.estado as EstadoPedido,
  // }));
  const [pedidos, setPedidos] = useState<PedidoVenta[]>([]);

  // useEffect(() => {
    // const fetchPedidos = async () => {
      // const pedidos = await 
    



  return (
    <div className="min-h-screen bg-neutral-light p-6 space-y-6">



      <PedidoVentaTable pedidos={pedidos} />
    </div>
  );
};

export default GestionVentasPage;
