'use client';

import Header from "@/app/components/Header";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RRHHInicio: React.FC = () => {
const router = useRouter();
  useEffect(() => {
    router.replace("/pages/rrhh/inicio/gestion-empleados");
  }, [router]);

  return (

    <div>
      {/* <Header /> */}
      Control de empleados 
    </div>
  );
};

export default RRHHInicio;
// "use client";

// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

// export default function InicioVendedor() {
//   const router = useRouter();

//   useEffect(() => {
//     router.replace("/pages/vendedor/inicio/gestion-ventas");
//   }, [router]);

//   // Muestra un loader o contenido vacío mientras se redirige
//   return (
//     <div className="flex h-screen items-center justify-center">
//       <p>Redirigiendo...</p>
//     </div>
//   );
// }