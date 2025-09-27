import Header from "@/app/components/Header";
import Link from "next/link";

const GerenteHome = () => (
  <div className="min-h-screen bg-neutral-light">
    <Header />
    <main className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Panel Gerencial</h2>
      <p>
        Este panel reunira los indicadores clave de la compania. Mientras definas los servicios
        definitivos puedes usar estos accesos directos para validar el flujo general.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/pages/rrhh/inicio" className="rounded-lg bg-white p-4 shadow hover:shadow-lg">
          <h3 className="text-lg font-semibold">Recursos Humanos</h3>
          <p className="text-sm text-neutral-dark">
            Consulta novedades del personal, altas y bajas registradas.
          </p>
        </Link>
        <Link href="/pages/vendedor/inicio" className="rounded-lg bg-white p-4 shadow hover:shadow-lg">
          <h3 className="text-lg font-semibold">Ventas</h3>
          <p className="text-sm text-neutral-dark">
            Revisa el pipeline de pedidos y el estado de cada operacion.
          </p>
        </Link>
      </div>
    </main>
  </div>
);

export default GerenteHome;
