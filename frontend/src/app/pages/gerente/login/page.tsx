import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginGerente: React.FC = () => (
  <div>
  <Header />
  <RoleLogin roleName="Gerente" colorClass="bg-neutral-light" redirectPath="/pages/gerente" />
  </div>
);

export default LoginGerente;
