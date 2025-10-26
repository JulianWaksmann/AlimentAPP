
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
export async function Ingreso_Costos_Ganancias(mes: number, anio: number){
    const datos = {
        mes: mes,
        anio: anio,
    };
    const response = await fetch(`${apiUrl}/reportes-graficos/obtener-datos-finanzas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al obtener datos de finanzas");
      }
      const data = await response.json();
      return data.datos_finanzas;

    }   

export async function Ganancias_total(){
    const response = await fetch(`${apiUrl}/reportes-graficos/get-ganancias-por-fecha`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al obtener ganancias totales");
          }
        const data = await response.json();
        return data.ganancias_por_fecha;

}

export async function Produccion_total_por_dia(){
    const response = await fetch(`${apiUrl}/reportes-graficos/get-eficiencia-produccion-kilogramos-finalizadas`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al obtener produccion total por dia");
          }
        const data = await response.json();
        return data.eficiencia_produccion;

}

export async function pedidosEntregados(mes: number, anio: number){
      const datos = {
        mes: mes,
        anio: anio,
    };
    const response = await fetch(`${apiUrl}/reportes-graficos/cant-pedidos-entregados-a-tiempo-y-demora`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al obtener pedidos entregados");
          }
        const data = await response.json();
        return data.pedidos_entregados_y_entregados_a_tiempo;
}