import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginSupervisor: React.FC = () => (
  <RoleLogin roleName="Supervisor" colorClass="bg-yellow-500" redirectPath="/pages/supervisor/inicio" />
);

export default LoginSupervisor;
