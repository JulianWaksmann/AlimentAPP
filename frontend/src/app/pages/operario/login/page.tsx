import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginOperarios: React.FC = () => (
  <div>
    <Header/>
  <RoleLogin roleName="Operario" colorClass="bg-neutral-light" redirectPath="/pages/operario/inicio" />
  </div>
);

export default LoginOperarios;
