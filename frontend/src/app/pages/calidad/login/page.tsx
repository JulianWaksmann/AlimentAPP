import React from "react";
import RoleLogin from "@/app/components/RoleLogin";

const LoginCalidad: React.FC = () => (
  <RoleLogin roleName="Calidad" colorClass="bg-pink-500" redirectPath="/pages/calidad/inicio" />
);

export default LoginCalidad;
