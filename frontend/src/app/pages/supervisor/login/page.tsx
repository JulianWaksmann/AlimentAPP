import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginSupervisor: React.FC = () => (
  <div>
    <Header />
  <RoleLogin roleName="Supervisor" colorClass="bg-neutral-light" redirectPath="/pages/supervisor/inicio" />
  </div>
);

export default LoginSupervisor;
