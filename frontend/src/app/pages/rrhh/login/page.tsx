import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginRRHH: React.FC = () => (
  <div>
  <RoleLogin roleName="RRHH" colorClass="bg-neutral-light" redirectPath="/pages/rrhh/inicio" />
  </div>
);

export default LoginRRHH;
