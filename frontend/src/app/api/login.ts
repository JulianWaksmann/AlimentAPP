

// Función para usar en el frontend
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function Login({ email, password, role }: { email: string; password: string; role: string }) {
  console.log("Login called with:", { email, password, role });
  const response = await fetch(`${apiUrl}/login-empleado`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      email: email.toLowerCase(), 
      password: password, 
      rol: role.toLowerCase() }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Error de autenticación");
  }
  return data;
}
// src/app/api/login.ts
// import type { NextApiRequest, NextApiResponse } from 'next';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Método no permitido' });
//   }
//   const { email, password, role } = req.body;
//   // Simulación de autenticación
//   if (!email || !password || !role) {
//     return res.status(400).json({ error: 'Faltan datos' });
//   }
//   if (email === 'test@test.com' && password === '1234' && role === 'admin') {
//     return res.status(200).json({ ok: true });
//   }
//   return res.status(400).json({ error: 'Credenciales incorrectas' });
// }
