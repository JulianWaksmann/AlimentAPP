"use client";
import Header from "@/app/components/Header";
import React, { useEffect, useState } from "react";
import { OrdenProduccion } from "@/app/models/OrdenProduccion";
import { GetOrdenesProduccion } from "@/app/api/produccion";
import OrdenesDeProduccionTable from "@/app/components/OrdenesDeProduccionTable";

const OrdenesDeTrabajoPage = () => {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);

  useEffect(() => {
    async function fetchOrdenes() {
      const res = await GetOrdenesProduccion();
      setOrdenes(res);
      console.log(res);
    }
    fetchOrdenes();
  }, []);

  return (
    <div>
      <Header />

      <div className="flex items-center p-6 bg-white border-b border-gray-200">
        <OrdenesDeProduccionTable ordenes={ordenes} />
      </div>
    </div>
  );
};

export default OrdenesDeTrabajoPage;

