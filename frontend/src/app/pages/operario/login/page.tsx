import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginOperarios: React.FC = () => (
  <div>
    <Header/>
  <RoleLogin roleName="Operario" colorClass="bg-neutral-light" redirectPath="/pages/operario/inicio" emailDemo="uma.rodriguez@hotmail.com" passwordDemo="pass42706266" />
  </div>
);

export default LoginOperarios;
