"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

const menuItems = [
  { name: "Control de Produccion", href: "/pages/supervisor/inicio/produccion" },
  { name: "Gestion de Productos", href: "/pages/supervisor/inicio/productos" },
  { name: "Ordenes de Trabajo", href: "/pages/supervisor/inicio/ordenes-trabajo" },
  { name: "Materia Prima", href: "/pages/supervisor/inicio/materia-prima" },
];

const SupervisorLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-light">
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-primary p-4 text-white transition-transform md:static ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <h2 className="mb-6 text-center text-xl font-bold">SUPERVISOR</h2>
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

      <button
        className="fixed left-4 top-4 z-50 rounded bg-primary p-2 text-white md:hidden"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Abrir menu"
      >
        <Menu />
      </button>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default SupervisorLayout;
