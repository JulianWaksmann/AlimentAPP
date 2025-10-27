"use client";
import Header from "@/app/components/Header";
import React, { useEffect, useState } from "react";
import { OrdenProduccion } from "@/app/models/OrdenProduccion";
import { GetOrdenesProduccion } from "@/app/api/produccion";
import OrdenesDeProduccionTable from "@/app/components/OrdenesDeProduccionTable";
// import { SolicitudVenta } from "@/app/models/SolicitudVenta";
// import { GetSolicitudVenta } from "@/app/api/pedidosVenta";
// import SolicitudDeVentaTable from "@/app/components/SolicitudDeVentaTable";

const OrdenesDeTrabajoPage = () => {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  // const [solicitudes, setSolicitudes] = useState<SolicitudVenta[]>([]); // Ajusta el tipo según tu modelo de datos

  // useEffect(() => {
  //   async function fetchSolicitudes() {
  //     const res = await GetSolicitudVenta();
  //     setSolicitudes(res);
  //     // console.log(res);
  //   }
  //   fetchSolicitudes();
  // }, []);

  useEffect(() => {
    async function fetchOrdenes() {
      const res = await GetOrdenesProduccion();
      console.log(res);
      setOrdenes(res);
      // console.log(res);
    }
    fetchOrdenes();
  }, []);

  return (
    <div>
      <Header />
      {/* <div className=" items-center p-6 bg-white border-b border-details">
        <SolicitudDeVentaTable solicitudes={solicitudes} />
      </div> */}
      <div className="flex items-center p-6 bg-white border-b border-details">
        <OrdenesDeProduccionTable ordenes={ordenes} />
      </div>
    </div>
  );
};

export default OrdenesDeTrabajoPage;

