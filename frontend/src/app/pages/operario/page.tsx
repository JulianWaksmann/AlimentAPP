import Header from "@/app/components/Header";

const OperarioHome = () => (
  <div className="min-h-screen bg-neutral-light">
    <Header />
    <main className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Panel Operario</h2>
      <p>
        Aqui podras revisar las ordenes asignadas, reportar incidencias y consultar la
        documentacion de seguridad. Integra las vistas especificas cuando definas los flujos
        definitivos.
      </p>
      <div className="rounded-lg border border-details bg-white p-4 shadow">
        <h3 className="text-lg font-semibold">Pasos sugeridos</h3>
        <ul className="list-disc list-inside text-sm text-neutral-dark">
          <li>Sincroniza con el area de supervisor para recibir nuevas ordenes.</li>
          <li>Registra avances de cada turno y reporta cualquier incidencia.</li>
          <li>Consulta los recursos compartidos antes de iniciar una tarea especial.</li>
        </ul>
      </div>
    </main>
  </div>
);

export default OperarioHome;
