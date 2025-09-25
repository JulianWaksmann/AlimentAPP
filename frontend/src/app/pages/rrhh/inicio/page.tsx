'use client'
import React, { useState, useEffect } from "react";
import Header from "../../../components/Header";
import EmployeeTable from "../../../components/EmployeeTable";
import EmployeeModal from "../../../components/EmployeeModal";
import employeesData from "../../../../data/employees.json";
import { Employee } from "../../../models/Employee";


const RRHHInicio: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    setEmployees(employeesData);
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setEmployees(employees.filter((e) => e.id !== id));
  };

  const handleSave = (employee: Employee) => {
    if (editingEmployee) {
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id ? { ...emp, ...employee } : emp
        )
      );
    } else {
      const newEmployee: Employee = {
        ...employee,
        id: employees.length
          ? Math.max(...employees.map((e) => e.id).filter((id): id is number => typeof id === "number")) + 1
          : 1,
      };
      setEmployees([...employees, newEmployee]);
    }
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      <Header />

      <main className="p-6">
        <div className="flex justify-end mb-4">
          <button
            className="bg-success text-white px-4 py-2 rounded hover:opacity-90 transition"
            onClick={openAddModal}
          >
            Agregar Empleado
          </button>
        </div>

        <EmployeeTable
          employees={employees}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      </main>

      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingEmployee={editingEmployee}
      />
    </div>
  );
};

export default RRHHInicio;
