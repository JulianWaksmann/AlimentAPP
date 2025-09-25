import React from "react";
import RoleLogin from "../../../components/RoleLogin";

const LoginSupervisor: React.FC = () => {
  return <RoleLogin roleName="Supervisor" colorClass="bg-yellow-500" redirectPath="/pages/supervisor/inicio" />;
};

export default LoginSupervisor;
