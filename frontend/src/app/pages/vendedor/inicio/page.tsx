"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InicioVendedor() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pages/vendedor/inicio/gestion-ventas");
  }, [router]);

  // Muestra un loader o contenido vacío mientras se redirige
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirigiendo...</p>
    </div>
  );
}