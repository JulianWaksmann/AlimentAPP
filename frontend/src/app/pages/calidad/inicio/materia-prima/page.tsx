"use client"
import Header from "@/app/components/Header";
import TablaPedidosMateriaPrima from "@/app/components/TablaPedidosMateriaPrima";
import { aceptarMP } from "@/app/api/materiaPrima";

const MateriaPrimaPage = () => {

  
    // Lógica para aceptar toda la materia prima
    async function aceptarMateriaPrima() {
      try {
        const response = await aceptarMP()
        console.log("Materia prima aceptada:", response);
        window.location.reload();
      } catch (error) {
        console.error("Error al aceptar la materia prima:", error);
      }
      
    
    console.log("Aceptar toda la materia prima");
  }
  return (<div className="min-h-screen bg-neutral-light">
    <Header />
    <button onClick={() => aceptarMateriaPrima()} className="rounded bg-success p-2 text-white m-2 text-sm"> ACEPTAR TODO (solo para desarrollo)</button>
    <main className="p-6 space-y-4">
      <TablaPedidosMateriaPrima  />
      
    </main>
  </div>
)};

export default MateriaPrimaPage;
