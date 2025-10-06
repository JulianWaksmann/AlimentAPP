"use client";
import { getEmpleados } from "@/app/api/empleados";
import { useState, useEffect} from "react";
import { Employee } from "@/app/models/Employee";
import EmployeeTable from "@/app/components/EmployeeTable";


const GestionEmpleadosPage = () => {
    const [empleados, setEmpleados] = useState<Employee[]>([]);

    useEffect(() => {
        const fetchEmpleados = async () => {
            const res = await getEmpleados();
            setEmpleados(res);
        };
        fetchEmpleados();
    }, []);



  return <div>
    <h2 className="text-2xl font-bold text-primary text-center">Listado de empleados</h2>
    <EmployeeTable
      employees={empleados}
      onDelete={(id: number) => { /* implement delete logic here */ }}
      onEdit={(employee: Employee) => { /* implement edit logic here */ }}
    />

  </div>;
};

export default GestionEmpleadosPage;