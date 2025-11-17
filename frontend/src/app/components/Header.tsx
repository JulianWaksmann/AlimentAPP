"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Image from "next/image";

const Header: React.FC = () => {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };

  return (
    // <header className="bg-gradient-primary text-white py-3 text-center relative flex items-center justify-center">
          <header className="relative flex items-center justify-center py-3 text-center text-white">

      <Image
        src="/Banner.jpg"
        alt= "Banner"
        fill
        priority
        className="object-cover "
      />
      <div className="text-center">
        <h1 className="text-4xl font-bold">CORE.</h1>
        <h4>El Núcleo de tu Empresa</h4>
      </div>
      <button
        onClick={handleLogout}
        className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white text-primary rounded-md hover:bg-gray-200 transition"
        aria-label="Cerrar sesión"
      >
        <LogOut size={16} />
        <span></span>
      </button>
    </header>
  );
};

export default Header;
