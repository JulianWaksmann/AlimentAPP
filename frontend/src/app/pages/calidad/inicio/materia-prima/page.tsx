import Header from "@/app/components/Header";

const MateriaPrimaPage = () => (
  <div className="min-h-screen bg-neutral-light">
    <Header />
    <main className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Materia prima</h2>
      <p>
        Documenta los consumos, lotes ingresados y alertas de calidad en un tablero dedicado.
        Este modulo se conectara con la API de inventario cuando este disponible.
      </p>
      <div className="rounded-lg border border-dashed border-details bg-white p-6 text-center text-sm text-neutral-dark">
      Panel pendiente de integracion.
      </div>
    </main>
  </div>
);

export default MateriaPrimaPage;
