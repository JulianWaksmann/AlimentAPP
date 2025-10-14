"use client";
import SolicitudDeVentaTable from "@/app/components/SolicitudDeVentaTable";
import { SolicitudVenta } from "@/app/models/SolicitudVenta";
import React, { useState, useEffect} from "react";
import { GetSolicitudVenta } from "@/app/api/pedidosVenta";
import Header from "@/app/components/Header";

const VentasPendientesAprobacion = () => {
      const [solicitudes, setSolicitudes] = useState<SolicitudVenta[]>([]); // Ajusta el tipo según tu modelo de datos

        useEffect(() => {
          async function fetchSolicitudes() {
            const res = await GetSolicitudVenta();
            setSolicitudes(res);
            // console.log(res);
          }
          fetchSolicitudes();
        }, []);
    
  return (<div>
    <Header />
    <h1 className="text-3xl font-bold mb-4 text-primary text-center m-2">Ventas Pendientes de Aprobación</h1>
        <div className=" items-center p-6 bg-white border-b border-details">
            <SolicitudDeVentaTable solicitudes={solicitudes} />
        </div>
  </div>);
};

export default VentasPendientesAprobacion;