'use client';

import React, { useEffect, useState } from "react";
import Header from "@/app/components/Header";
// import EmployeeModal from "@/app/components/EmployeeModal";
// import EmployeeTable from "@/app/components/EmployeeTable";
// import employeesData from "@/data/employees.json";
// import { Employee } from "@/app/models/Employee";

const RRHHInicio: React.FC = () => {
  // const [employees, setEmployees] = useState<Employee[]>([]);
  // const [modalOpen, setModalOpen] = useState(false);
  // const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // useEffect(() => {
  //   setEmployees(employeesData);
  // }, []);

  // const openAddModal = () => {
  //   setEditingEmployee(null);
  //   setModalOpen(true);
  // };

  // const openEditModal = (employee: Employee) => {
  //   setEditingEmployee(employee);
  //   setModalOpen(true);
  // };

  // const handleDelete = (id: number) => {
  //   setEmployees((current) => current.filter((employee) => employee.id !== id));
  // };

  // const handleSave = (employee: Employee) => {
  //   setEmployees((current) => {
  //     if (editingEmployee?.id) {
  //       return current.map((item) => (item.id === editingEmployee.id ? { ...item, ...employee } : item));
  //     }

  //     const nextId = current.length ? Math.max(...current.map((item) => item.id ?? 0)) + 1 : 1;
  //     return [...current, { ...employee, id: nextId }];
  //   });

  //   setModalOpen(false);
  //   setEditingEmployee(null);
  // };

  return (
    // <div className="min-h-screen bg-neutral-light">
    //   <Header />
    //   <main className="p-6">
    //     <div className="mb-4 flex justify-end">
    //       <button
    //         className="rounded bg-success px-4 py-2 text-white transition hover:opacity-90"
    //         onClick={openAddModal}
    //       >
    //         Agregar empleado
    //       </button>
    //     </div>
    //     <EmployeeTable employees={employees} onEdit={openEditModal} onDelete={handleDelete} />
    //   </main>
    //   <EmployeeModal
    //     isOpen={modalOpen}
    //     onClose={() => {
    //       setModalOpen(false);
    //       setEditingEmployee(null);
    //     }}
    //     onSave={handleSave}
    //     editingEmployee={editingEmployee}
    //   />
    // </div>
    <div>
      <Header />
      Control de empleados - Módulo en desarrollo
    </div>
  );
};

export default RRHHInicio;
