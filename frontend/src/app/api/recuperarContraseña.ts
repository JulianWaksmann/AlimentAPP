// src/app/api/recuperarContraseña.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Simulación de base de datos en memoria
const codes: Record<string, string> = {};
const passwords: Record<string, string> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action, email, code, newPassword } = req.body;
    if (action === 'sendCode') {
      // Generar código aleatorio de 4 dígitos
      const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
      codes[email] = generatedCode;
      // Aquí deberías enviar el código por email
      return res.status(200).json({ ok: true });
    }
    if (action === 'verifyCode') {
      if (codes[email] && codes[email] === code) {
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ ok: false, error: 'Código incorrecto' });
    }
    if (action === 'updatePassword') {
      if (codes[email] && codes[email] === code) {
        passwords[email] = newPassword;
        delete codes[email];
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ ok: false, error: 'Código incorrecto' });
    }
    return res.status(400).json({ ok: false, error: 'Acción inválida' });
  }
  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
