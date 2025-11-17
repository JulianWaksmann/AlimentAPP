'use client';

import ClienteTable from "@/app/components/ClientesTable";
import { useEffect, useState } from "react";
import { Cliente } from "@/app/models/Cliente";
import { GetNombreApellidoClientes } from "@/app/api/clientes";



const GestionClientesPage = () => {


  return (
    <div>
      <ClienteTable  />
    </div>

  );

};

export default GestionClientesPage;

