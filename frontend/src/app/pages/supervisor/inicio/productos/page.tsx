import Header from "@/app/components/Header";

const ProductosPage = () => (
  <div className="min-h-screen bg-neutral-light">
    <Header />
    <main className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Gestion de productos</h2>
      <p>
        Centraliza aqui las fichas tecnicas, codigos de trazabilidad y estados de aprobacion.
        Integra el backoffice cuando dispongas del servicio correspondiente.
      </p>
      <div className="rounded-lg border border-dashed border-details bg-white p-6 text-center text-sm text-neutral-dark">
        Agrega un listado o tablero cuando definas el modelo de datos final.
      </div>
    </main>
  </div>
);

export default ProductosPage;
