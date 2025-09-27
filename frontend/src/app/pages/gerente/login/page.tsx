import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginGerente: React.FC = () => (
  <RoleLogin roleName="Gerente" colorClass="bg-red-500" redirectPath="/pages/gerente" />
);

export default LoginGerente;
