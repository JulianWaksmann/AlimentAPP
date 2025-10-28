'use client';

import ClienteTable from "@/app/components/ClientesTable";
import { useEffect, useState } from "react";
import { Cliente } from "@/app/models/Cliente";
import { GetNombreApellidoClientes } from "@/app/api/clientes";



const GestionClientesPage = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await GetNombreApellidoClientes();
        setClientes(res);
      } catch (error) {
        console.error("Error fetching clientes:", error);
      }
    };
    fetchClientes();
  }, []);

  return (
    <div>
      <ClienteTable clientes={clientes} />
    </div>

  );

};

export default GestionClientesPage;

