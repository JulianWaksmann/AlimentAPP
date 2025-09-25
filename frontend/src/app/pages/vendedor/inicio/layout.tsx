"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "../../../components/Header";

//Layout del dashboard con la barra de navegacion
export default function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  //Estilos para la barra de navegacion
  const navLinkClasses = (path: string) =>
    `py-3 px-3 text-center font-semibold transition-colors duration-300 ${
      pathname === path
        ? "border-b-2 border-details text-details"
        : "text-gray-500 hover:text-details"
    }`;

  return (
    <div>
      <div  className=" w-80% ">
        <Header />
        <nav className="flex flex-row justify-around border-b ">
          <Link
            href="/pages/vendedor/inicio/gestion-ventas"
            className={navLinkClasses("/pages/vendedor/inicio/gestion-ventas")}
          >
            PEDIDOS DE VENTAS
          </Link>
          <Link
            href="/pages/vendedor/inicio/administracion-clientes"
            className={navLinkClasses("/pages/vendedor/inicio/administracion-clientes")}
          >
            CLIENTES
          </Link>
        </nav>
      </div>
      <div>
        <div>{children}</div>
      </div>
    </div>
  );
}
