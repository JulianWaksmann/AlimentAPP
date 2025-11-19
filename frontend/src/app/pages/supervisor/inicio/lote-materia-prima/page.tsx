"use client"
import { useEffect, useState } from "react"
import { LotesMP } from "@/app/models/MateriaPrima"
import { getLotes } from "@/app/api/materiaPrima"
import Header from "@/app/components/Header"

const LoteMateriaPrimaPage = () => {
  const [materias, setMaterias] = useState<LotesMP[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const response = await getLotes()
        // soporta respuesta con { materias_primas: [...] } o directamente [...]
        function hasMateriasPrimas(obj: unknown): obj is { materias_primas: LotesMP[] } {
          return (
            typeof obj === "object" &&
            obj !== null &&
            "materias_primas" in obj &&
            Array.isArray((obj as { materias_primas: unknown }).materias_primas)
          )
        }
        const data = hasMateriasPrimas(response) ? response.materias_primas : response
        setMaterias(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error("Error al obtener lotes:", e)
        setMaterias([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const selectedMateria = materias.find(m => m.id_materia_prima === selectedId) ?? null

  const filteredLotes = selectedMateria
    ? selectedMateria.lotes.filter(l => l.codigo_lote.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : []

  return (
    <div className="">
      <Header/>
      <div className="p-3">

      <h1 className="text-2xl font-semibold mb-4 text-center">Lotes de Materias Primas</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></span>
        </div>
      ) : materias.length === 0 ? (
        <p className="text-center">No hay materias primas.</p>
      ) : (
        <>
          {/* Lista de materias - diseño mobile: scroll horizontal con pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {materias.map(m => (
              <button
                key={m.id_materia_prima}
                onClick={() => {
                  setSelectedId(prev => (prev === m.id_materia_prima ? null : m.id_materia_prima))
                  setSearchTerm("")
                }}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium ${
                  selectedId === m.id_materia_prima ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.nombre_materia_prima}
              </button>
            ))}
          </div>

          {/* Si no hay materia seleccionada, mostrar instrucción */}
          {!selectedMateria ? (
            <p className="text-center text-sm text-gray-600">Selecciona una materia prima para ver su historial de lotes.</p>
          ) : (
            <div>
              {/* Encabezado de la materia seleccionada */}
              <div className="mb-3">
                <h2 className="text-lg font-semibold">{selectedMateria.nombre_materia_prima}</h2>
                <p className="text-sm text-gray-500">Unidad: {selectedMateria.unidad_medida}</p>
              </div>

              {/* Buscador por codigo_lote */}
              <div className="flex gap-2 mb-4">
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  type="text"
                  placeholder="Buscar por código de lote (ej. LT-1212)"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-3 py-2 bg-gray-100 rounded-md text-sm"
                >
                  Limpiar
                </button>
              </div>

              {/* Lista de lotes (mobile: cards) */}
              {filteredLotes.length === 0 ? (
                <p className="text-sm text-center text-gray-600">No se encontraron lotes.</p>
              ) : (
                <ul className="space-y-3">
                  {filteredLotes.map(lote => (
                    <li key={lote.id_lote} className="border rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">Código:</span>
                            <span className="text-xs">{lote.codigo_lote}</span>
                            <span className={`ml-2 text-xs px-2 py-1 rounded-full ${lote.estado === "disponible" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {lote.estado}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">Proveedor: {lote.nombre_proveedor}</p>
                          <p className="text-sm text-gray-600">Cantidad: {lote.cantidad_total} {selectedMateria.unidad_medida}</p>
                          <p className="text-sm text-gray-600">Ingreso: {lote.fecha_ingreso}</p>

                          {/* <p className="text-sm text-gray-600">Ingreso: {new Date(lote.fecha_ingreso).toLocaleDateString()}</p> */}
                          <p className="text-sm text-gray-600">Vencimiento: {lote.fecha_vencimiento}</p>
                        </div>
                        <div className="ml-3">
                          <button
                            onClick={() => console.log("Descargar informe - id_lote:", lote.id_lote)}
                            className="px-3 py-2 bg-primary text-white rounded-md text-sm"
                          >
                            Descargar informe
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}

export default LoteMateriaPrimaPage


