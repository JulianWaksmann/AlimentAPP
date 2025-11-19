import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginVendedor: React.FC = () => (
  <div>
    <Header />
  <RoleLogin roleName="Vendedor" colorClass="bg-neutral-light" redirectPath="/pages/vendedor/inicio" />
  </div>
);

export default LoginVendedor;
