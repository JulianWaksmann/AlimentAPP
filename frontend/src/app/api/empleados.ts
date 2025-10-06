
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
export async function getEmpleados(){
    const response = await fetch(`${apiUrl}/all-empleados`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Error fetching empleados");
  }
    const data = await response.json();

  // console.log(data.empleados);
    return data.Empleados;

  // return response.json();

}

export async function createEmpleado(empleadoData: {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  rol: string;
  password: string;
}) {
  const response = await fetch(`${apiUrl}/register-empleado`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(empleadoData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error creating empleado");
  }
  return response.json();
}