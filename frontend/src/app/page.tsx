// export default function Home() {
//   return (
// <div className="text-blue-600 font-bold text-2xl">
//   ¡Tailwind funciona!
// </div>
//   );
// }
// // 
'use client';
import React from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

const LandingPage: React.FC = () => {
  const router = useRouter();

  const roles = [
    { name: "RRHH", color: "bg-blue-500", path: "/pages/rrhh/login" },
    { name: "EMPLEADOS", color: "bg-green-500", path: "/pages/operario/login" },
    { name: "SUPERVISOR", color: "bg-yellow-500", path: "/pages/supervisor/login" },
    { name: "GERENTE", color: "bg-red-500", path: "/pages/gerente/login" },
    { name: "VENDEDOR", color: "bg-purple-500", path: "/pages/vendedor/login" },
  ];

  return (
    <div  className="bg-neutral-light">
      <Header />
      <main className="flex flex-col items-center mt-10 gap-6 bg-neutral-light">
        {roles.map((role) => (
          <button
            key={role.name}
            className={`${role.color} text-white font-bold py-4 px-10 rounded-lg hover:opacity-90 transition`}
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
