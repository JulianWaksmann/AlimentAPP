import React from "react";
import RoleLogin from "@/app/components/RoleLogin";
import Header from "@/app/components/Header";

const LoginRRHH: React.FC = () => (
  <div>
    <Header />
  <RoleLogin roleName="RRHH" colorClass="bg-neutral-light" redirectPath="/pages/rrhh/inicio" emailDemo="fakemail@gmail.com" passwordDemo="pass91218" />
  </div>
);

export default LoginRRHH;
