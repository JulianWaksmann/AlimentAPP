import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginLogistica: React.FC = () => (
  <RoleLogin roleName="Logistica" colorClass="bg-gray-500" redirectPath="/pages/logistica/inicio" />
);

export default LoginLogistica;
