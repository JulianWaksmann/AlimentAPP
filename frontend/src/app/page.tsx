"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

const roles = [
  { name: "RRHH", color: "bg-blue-500", path: "/pages/rrhh/login" },
  { name: "Operario", color: "bg-green-500", path: "/pages/operario/login" },
  { name: "Supervisor", color: "bg-yellow-500", path: "/pages/supervisor/login" },
  { name: "Gerente", color: "bg-red-500", path: "/pages/gerente/login" },
  { name: "Vendedor", color: "bg-purple-500", path: "/pages/vendedor/login" },
  { name: "Calidad", color: "bg-pink-500", path: "/pages/calidad/login" },
  { name: "Logistica", color: "bg-gray-500", path: "/pages/logistica/login" },
];

const LandingPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-light">
      <Header />
      <main className="flex flex-col items-center gap-6 px-4 py-10">
        <p className="max-w-2xl text-center text-lg text-neutral-dark">
          Selecciona el perfil que deseas ingresar.
        </p>
        {roles.map((role) => (
          <button
            key={role.name}
            className={`${role.color} w-full max-w-xs rounded-lg py-4 text-lg font-bold text-white transition hover:opacity-90`}
            onClick={() => router.push(role.path)}
          >
            {role.name}
          </button>
        ))}
      </main>
    </div>
  );
};

export default LandingPage;
