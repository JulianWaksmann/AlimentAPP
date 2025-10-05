import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginOperarios: React.FC = () => (
  <RoleLogin roleName="Operario" colorClass="bg-green-500" redirectPath="/pages/operario/inicio" />
);

export default LoginOperarios;
