import { Flota } from "../models/Flota";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function CreateFlota(flota: Flota) {

    const response = await fetch(`${apiUrl}/gestion-vehiculos/post-registrar-vehiculo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(flota),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear la flota");
    }
    return response.json();

}

export async function GetFlotas(): Promise<Flota[]> {
    const response = await fetch(`${apiUrl}/gestion-vehiculos/get-vehiculos-disponibles`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error("Error fetching flotas");
    }
    const data = await response.json();
    console.log(data.flotas);
    return Array.isArray(data.vehiculos) ? data.vehiculos : [];
}