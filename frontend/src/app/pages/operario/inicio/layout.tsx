"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

const menuItems = [
  { name: "Listas para produccion", href: "/pages/operario/inicio/ordenes-produccion-listas-para-produccion" },
  { name: "En proceso", href: "/pages/operario/inicio/ordenes-produccion-en-proceso" },
  { name: "Finalizadas", href: "/pages/operario/inicio/ordenes-produccion-finalizadas" },
  { name: "Historial", href: "/pages/operario/inicio/ordenes-produccion-historial" },
];

const tandasItems = [
  { name: "Tandas Sugeridas", href: "/pages/operario/inicio/tandas-sugeridas" },
  { name: "Tandas en Proceso", href: "/pages/operario/inicio/tandas-en-proceso" },
  { name: "Generar Tanda", href: "/pages/operario/inicio/generar-tanda" },
  // { name: "Historial de tandas", href: "/pages/operario/inicio/historial-tandas" },
]

const OperarioLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-light">
      {/* Menú lateral: ocultable en mobile/tablet, fijo en desktop (lg+) */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-primary p-4 text-white transition-transform lg:static ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <h2 className="mt-10 text-center text-m font-bold">Tandas de Produccion</h2>
        <nav className="flex flex-col gap-2">
          {tandasItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded p-2 ${isActive ? "bg-primary-light" : "hover:bg-primary-softer"}`}
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
                <h2 className="mt-10 text-center text-m font-bold">Ordenes de Produccion</h2>
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded p-2 ${isActive ? "bg-primary-light" : "hover:bg-primary-softer"}`}
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Botón menú hamburguesa solo en mobile/tablet (hasta lg) */}
      <button
        className="fixed left-4 top-4 z-50 rounded bg-primary p-2 text-white lg:hidden"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Abrir menu"
      >
        <Menu />
      </button>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default OperarioLayout;
