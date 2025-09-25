import React from "react";
import RoleLogin from "../../../components/RoleLogin";

const LoginGerente: React.FC = () => {
  return <RoleLogin roleName="Gerente" colorClass="bg-red-500" redirectPath="../pages/gerente" />;
};

export default LoginGerente;
