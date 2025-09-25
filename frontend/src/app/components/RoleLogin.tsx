'use client'
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface RoleLoginProps {
  roleName: string;       // Nombre del rol: "RRHH", "Empleados", etc.
  colorClass: string;     // Clase de Tailwind para el color del botón: "bg-blue-500"
  redirectPath: string;   // Ruta a la que redirigir tras login: "/roles/rrhh"
}

const RoleLogin: React.FC<RoleLoginProps> = ({ roleName, colorClass, redirectPath }) => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Lógica de autenticación real
    router.push(redirectPath);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${colorClass}`}>
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-96 flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center">{`Login ${roleName}`}</h2>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-details rounded px-4 py-2"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-details rounded px-4 py-2"
        />
        <button
          type="submit"
          className={`${colorClass} border-details border text-white font-bold py-2 rounded hover:opacity-90 transition`}
        >
          Ingresar
        </button>
      </form>
    </div>
  );
};

export default RoleLogin;
