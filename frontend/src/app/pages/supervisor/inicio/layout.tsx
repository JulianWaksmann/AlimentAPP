"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react"; // icono de menú (opcional, instalá lucide-react)

const menuItems = [
  { name: "Control de Producción", href: "/pages/supervisor/inicio/produccion" },
  { name: "Gestión de Productos", href: "/pages/supervisor/inicio/productos" },
  { name: "Órdenes de Trabajo", href: "/pages/supervisor/inicio/ordenes-trabajo" },
  { name: "Materia Prima", href: "/pages/supervisor/inicio/materia-prima" },
];

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-light">
      {/* Sidebar */}
      
      <div
        className={`fixed md:static top-0 left-0 h-full bg-primary text-white w-64 p-4 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } transition-transform md:translate-x-0 z-50`}
      >
        <h2 className="text-xl text-center font-bold mb-6">SUPERVISOR</h2>
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2 rounded ${
                pathname === item.href
                  ? "bg-primary-light"
                  : "hover:bg-primary-softer"
              }`}
              onClick={() => setOpen(false)} // cerrar en mobile
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Botón menú mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-primary text-white p-2 rounded"
        onClick={() => setOpen(!open)}
      >
        <Menu />
      </button>

      {/* Contenido principal */}
      <main className="flex-1 ">{children}</main>
    </div>
  );
}
