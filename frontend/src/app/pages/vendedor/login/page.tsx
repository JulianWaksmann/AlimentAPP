import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginVendedor: React.FC = () => (
  <RoleLogin roleName="Vendedor" colorClass="bg-purple-500" redirectPath="/pages/vendedor/inicio" />
);

export default LoginVendedor;
