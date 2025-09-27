import ChartLineaProduccion from "@/app/components/ChartLineaProduccion";
import Header from "@/app/components/Header";

const estadosLineaUno = [
  { color: "gris", descripcion: "Linea apagada" },
  { color: "gris", descripcion: "Linea apagada" },
  { color: "amarillo", descripcion: "Esperando materia prima" },
  { color: "amarillo", descripcion: "Esperando materia prima" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "rojo", descripcion: "Detenido" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "violeta", descripcion: "Mantenimiento" },
  { color: "verde", descripcion: "Produccion" },
  { color: "gris", descripcion: "Linea apagada" },
];

const estadosLineaDos = [
  { color: "gris", descripcion: "Linea apagada" },
  { color: "gris", descripcion: "Linea apagada" },
  { color: "amarillo", descripcion: "Esperando materia prima" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "violeta", descripcion: "Mantenimiento" },
  { color: "violeta", descripcion: "Mantenimiento" },
  { color: "violeta", descripcion: "Mantenimiento" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "rojo", descripcion: "Detenido" },
  { color: "amarillo", descripcion: "Esperando materia prima" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "verde", descripcion: "Produccion" },
  { color: "gris", descripcion: "Linea apagada" },
];

const ProduccionPage = () => (
  <>
    <Header />
    <div className="m-4 rounded-lg border border-details bg-neutral-light p-4">
      <h1 className="text-2xl font-bold text-primary">Control de lineas por hora</h1>
      <p className="mt-1 text-sm text-neutral-dark">
        Usa esta vista para validar los estados simulados antes de conectar la telemetria real.
      </p>
      <hr className="my-4" />
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Linea de produccion 1</h2>
          <ChartLineaProduccion estados={estadosLineaUno} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Linea de produccion 2</h2>
          <ChartLineaProduccion estados={estadosLineaDos} />
        </div>
      </section>
    </div>
  </>
);

export default ProduccionPage;
