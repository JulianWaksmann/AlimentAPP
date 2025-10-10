// // src/app/api/recuperarContraseña.ts
// import type { NextApiRequest, NextApiResponse } from 'next';

// // Simulación de base de datos en memoria
// const codes: Record<string, string> = {};
// const passwords: Record<string, string> = {};

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method === 'POST') {
//     const { action, email, code, newPassword } = req.body;
//     if (action === 'sendCode') {
//       // Generar código aleatorio de 4 dígitos
//       const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
//       codes[email] = generatedCode;
//       // Aquí deberías enviar el código por email
//       return res.status(200).json({ ok: true });
//     }
//     if (action === 'verifyCode') {
//       if (codes[email] && codes[email] === code) {
//         return res.status(200).json({ ok: true });
//       }
//       return res.status(400).json({ ok: false, error: 'Código incorrecto' });
//     }
//     if (action === 'updatePassword') {
//       if (codes[email] && codes[email] === code) {
//         passwords[email] = newPassword;
//         delete codes[email];
//         return res.status(200).json({ ok: true });
//       }
//       return res.status(400).json({ ok: false, error: 'Código incorrecto' });
//     }
//     return res.status(400).json({ ok: false, error: 'Acción inválida' });
//   }
//   return res.status(405).json({ ok: false, error: 'Método no permitido' });
// }
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
export async function EnviarCodigoAlMail (email: string) {
  const response = await fetch(`${apiUrl}/recuperar-password/enviar-codigo-verificacion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    return { success: false, error: errorData.error || "Error en login" };
  }
  return { success: true };
}

export async function VerificarCodigo (email: string, code: string) {
  const response = await fetch(`${apiUrl}/recuperar-password/validar-codigo-verificacion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      codigo_verificacion: code,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    return { success: false, error: errorData.error || "Error en login" };
  }
  return { success: true };
}

export async function ActualizarPassword (email: string, newPassword: string) {
  const response = await fetch(`${apiUrl}/recuperar-password/update-password-empleado`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      nuevo_password: newPassword,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    return { success: false, error: errorData.error || "Error en login" };
  }
  return { success: true };
}

  


