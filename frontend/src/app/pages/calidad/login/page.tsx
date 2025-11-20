import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginCalidad: React.FC = () => (
  <div>
    <Header/>
  <RoleLogin roleName="Calidad" colorClass="bg-neutral-light" redirectPath="/pages/calidad/inicio" />
  </div>
);

export default LoginCalidad;
