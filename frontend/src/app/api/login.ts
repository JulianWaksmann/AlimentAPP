// src/app/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { email, password, role } = req.body;
  // Simulación de autenticación
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  if (email === 'test@test.com' && password === '1234' && role === 'admin') {
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: 'Credenciales incorrectas' });
}
