import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginGerente: React.FC = () => (
  <div>
  <Header />
  <RoleLogin roleName="Gerente" colorClass="bg-neutral-light" redirectPath="/pages/gerente" emailDemo="victoria.diaz@hotmail.com" passwordDemo="pass44882305" />
  </div>
);

export default LoginGerente;
