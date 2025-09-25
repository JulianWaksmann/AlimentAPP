import React from "react";
import RoleLogin from "../../../components/RoleLogin";

const LoginRRHH: React.FC = () => {
  return <RoleLogin roleName="VENDEDOR" colorClass="bg-purple-500" redirectPath="/pages/vendedor/inicio" />;
};

export default LoginRRHH;
