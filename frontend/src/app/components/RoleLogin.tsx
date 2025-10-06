"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;


interface RoleLoginProps {
  roleName: string;
  colorClass: string;
  redirectPath: string;
}

const RoleLogin: React.FC<RoleLoginProps> = ({ roleName, colorClass, redirectPath }) => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  function validateEmail(email: string) {
    return /^\S+@\S+\.\S+$/.test(email);
  }

  const handleLogin = async (event: React.FormEvent) => {
            // router.push(redirectPath);

    event.preventDefault();
    if (!validateEmail(username)) {
      setModalMsg("El correo ingresado no es válido.");
      setModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/login-empleado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.toLowerCase(),
          password: password.toLowerCase(),
          rol: roleName.toLowerCase(),
        }),
      });
      const data = await res.json();
      if (res.status === 200) {
        router.push(redirectPath);
      } else {
        setModalMsg(data.error || "Error desconocido");
        setModalOpen(true);
      }
    } catch (err) {
      setModalMsg("Error de red. Intenta nuevamente.");
      setModalOpen(true);
    }
  };

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center ${colorClass}`}>
      {/* Modal de error */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="rounded-lg p-6 shadow-lg w-80 text-center bg-red-50 border border-red-300">
            <h3 className="text-lg font-bold mb-2 text-red-600">Error</h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded font-semibold bg-red-600 text-white hover:opacity-90 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}
      <form
        onSubmit={handleLogin}
        className="flex w-96 flex-col gap-4 rounded-lg bg-white p-8 shadow-md"
      >
        <h2 className="text-center text-2xl font-bold">{`Login ${roleName}`}</h2>
        <input
          type="text"
          placeholder="Correo electrónico"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded border border-details px-4 py-2"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded border border-details px-4 py-2"
        />
        <button
          type="submit"
          className={`${colorClass} border border-details py-2 font-bold text-white transition hover:opacity-90`}
        >
          Ingresar
        </button>
        <a href="../../../pages/recuperar-credenciales" className=" text-blue-500 underline ">Olvidé mis credenciales</a>
      </form>
    </div>
  );
};

export default RoleLogin;
