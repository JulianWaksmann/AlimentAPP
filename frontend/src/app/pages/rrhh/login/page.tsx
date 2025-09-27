import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginRRHH: React.FC = () => (
  <RoleLogin roleName="RRHH" colorClass="bg-blue-500" redirectPath="/pages/rrhh/inicio" />
);

export default LoginRRHH;
