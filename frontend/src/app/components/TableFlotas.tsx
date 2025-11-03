import { Flota } from "../models/Flota";

export const TableFlotas = ({ flotas }: { flotas: Flota[] }) => {
    return (
        <div className="overflow-x-auto mt-4">
            <table className="min-w-full bg-white border border-gray-200">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">ID</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">Modelo</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">Patente</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">Capacidad</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">Nombre conductor</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">DNI</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">Empresa</th>

                        {/* <th className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left">Estado</th> */}
                    </tr>
                </thead>
                <tbody  >
                    {flotas.map((flota) => (
                        <tr key={flota.id}>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.id}</td>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.tipo_unidad}-{flota.modelo}</td>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.patente}</td>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.capacidad_kg}</td>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.nombre_conductor} {flota.apellido_conductor}</td>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.dni_conductor}</td>
                            <td className="py-2 px-4 border-b border-gray-200">{flota.empresa}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}