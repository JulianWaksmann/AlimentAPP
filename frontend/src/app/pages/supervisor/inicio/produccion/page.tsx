import ChartLineaProduccion from "@/app/components/ChartLineaProduccion";
import Header from "@/app/components/Header";
import React from "react";
// import RoleLogin from "../../../components/RoleLogin";
const estadosEjemplo1 = [
  { color: "gris", descripcion: "LÍNEA APAGADA" },
  { color: "gris", descripcion: "LÍNEA APAGADA" },
  { color: "amarillo", descripcion: "ESPERANDO MATERIA PRIMA" },
  { color: "amarillo", descripcion: "ESPERANDO MATERIA PRIMA" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "rojo", descripcion: "DETENIDO" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "violeta", descripcion: "MANTENIMIENTO" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "gris", descripcion: "LÍNEA APAGADA" },

  // etc...
];
const estadosEjemplo2 = [
  { color: "gris", descripcion: "LÍNEA APAGADA" },
  { color: "gris", descripcion: "LÍNEA APAGADA" },
  { color: "amarillo", descripcion: "ESPERANDO MATERIA PRIMA" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "violeta", descripcion: "MANTENIMIENTO" },
  { color: "violeta", descripcion: "MANTENIMIENTO" },
  { color: "violeta", descripcion: "MANTENIMIENTO" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "rojo", descripcion: "DETENIDO" },
  { color: "amarillo", descripcion: "ESPERANDO MATERIA PRIMA" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "verde", descripcion: "PRODUCCIÓN" },
  { color: "gris", descripcion: "LÍNEA APAGADA" },

  // etc...
];
const produccionPage: React.FC = () => {
  return (
    <>
      <Header />
      <div className="p-4 bg-neutral-light m-4 rounded-lg border border-details">
        <h1 className="text-2xl text-black  ">
          Control de operabilidad de lineas de produccion por hs.
        </h1>
        <hr />
        <h4 className="mt-3 ">Linea de produccion 1</h4>
        <ChartLineaProduccion estados={estadosEjemplo1} />
        <h4 className="mt-3 ">Linea de produccion 2</h4>
        <ChartLineaProduccion estados={estadosEjemplo2} />
      </div>
    </>
  );
};
export default produccionPage;
