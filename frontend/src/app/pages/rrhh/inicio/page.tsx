'use client';

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
