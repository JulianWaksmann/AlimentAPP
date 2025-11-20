import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginLogistica: React.FC = () => (
  <div>
    <Header/>
  <RoleLogin roleName="Logistica" colorClass="bg-neutral-light" redirectPath="/pages/logistica/inicio" />
  </div>
);

export default LoginLogistica;
