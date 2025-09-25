import React from "react";
import RoleLogin from "../../../components/RoleLogin";

const LoginOperarios: React.FC = () => {
  return <RoleLogin roleName="Operario" colorClass="bg-green-500" redirectPath="/pages/operario" />;
};

export default LoginOperarios;
