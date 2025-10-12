"use client"
import Header from "@/app/components/Header";

import TablaPedidosMateriaPrima from "@/app/components/TablaPedidosMateriaPrima";

const MateriaPrimaPage = () => {

  return (<div className="min-h-screen bg-neutral-light">
    <Header />
    <main className="p-6 space-y-4">
      <TablaPedidosMateriaPrima  />
      
    </main>
  </div>
)};

export default MateriaPrimaPage;
