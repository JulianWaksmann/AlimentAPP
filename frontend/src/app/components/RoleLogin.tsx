"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface RoleLoginProps {
  roleName: string;
  colorClass: string;
  redirectPath: string;
}

const RoleLogin: React.FC<RoleLoginProps> = ({ roleName, colorClass, redirectPath }) => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: integrate real authentication
    router.push(redirectPath);
  };

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center ${colorClass}`}>
      <form
        onSubmit={handleLogin}
        className="flex w-96 flex-col gap-4 rounded-lg bg-white p-8 shadow-md"
      >
        <h2 className="text-center text-2xl font-bold">{`Login ${roleName}`}</h2>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded border border-details px-4 py-2"
        />
        <input
          type="password"
          placeholder="Contrasena"
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
      <a href="../../../pages/recuperar-credenciales" className=" text-blue-500 underline ">Olvide mis credenciales</a>

      </form>
    </div>
  );
};

export default RoleLogin;
