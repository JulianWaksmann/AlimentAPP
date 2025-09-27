"use client";

import Header from "@/app/components/Header";
import TablaOT from "@/app/components/TablaOT";
import TablaPedidos from "@/app/components/SolicitudDeOT";
import React, { useState } from "react";

export interface OrdenDeTrabajo {
  id: number;
  cliente: string;
  producto: string;
  cantidad: number;
  fechaEntrega: string;
  estado: "Pendiente" | "Asignada" | "En Proceso" | "Completada";
}

export interface LineaProduccion {
  id: number;
  nombre: string;
  estado: "Disponible" | "Ocupada";
}

export interface MateriaPrima {
  id: number;
  nombre: string;
  stock: number;
  requerido: number;
}

export interface Pedido {
  idPedido: number;
  productos: { idProducto: number; nombre: string; cantidad: number }[];
  fechaPedido: string;
  fechaEntrega: string;
}

const pedidosMock: Pedido[] = [
  {
    idPedido: 103,
    productos: [
      { idProducto: 502, nombre: "Producto B", cantidad: 5 },
      { idProducto: 504, nombre: "Producto D", cantidad: 2 },
    ],
    fechaPedido: "2025-09-13T09:15:00Z",
    fechaEntrega: "2025-09-18T00:00:00Z",
  },
  {
    idPedido: 104,
    productos: [{ idProducto: 505, nombre: "Producto C", cantidad: 10 }],
    fechaPedido: "2025-09-14T11:20:00Z",
    fechaEntrega: "2025-09-20T00:00:00Z",
  },
];

const ordenesMock: OrdenDeTrabajo[] = [
  {
    id: 1,
    cliente: "Cliente 1",
    producto: "Producto A",
    cantidad: 10,
    fechaEntrega: "2025-09-15",
    estado: "Pendiente",
  },
  {
    id: 2,
    cliente: "Cliente 124",
    producto: "Producto B",
    cantidad: 10,
    fechaEntrega: "2025-09-15",
    estado: "Pendiente",
  },
  {
    id: 3,
    cliente: "Cliente 112",
    producto: "Producto C",
    cantidad: 10,
    fechaEntrega: "2025-09-15",
    estado: "Pendiente",
  },
];

const lineasMock: LineaProduccion[] = [
  { id: 1, nombre: "Linea 1", estado: "Disponible" },
  { id: 2, nombre: "Linea 2", estado: "Ocupada" },
];

const materiasMock: Record<number, MateriaPrima[]> = {
  1: [
    { id: 1, nombre: "Materia X", stock: 100, requerido: 50 },
    { id: 2, nombre: "Materia Y", stock: 40, requerido: 60 },
  ],
  2: [
    { id: 3, nombre: "Materia Z", stock: 75, requerido: 30 },
    { id: 4, nombre: "Insumo A", stock: 20, requerido: 40 },
  ],
};

const OrdenesDeTrabajoPage = () => {
  const [ordenes, setOrdenes] = useState<OrdenDeTrabajo[]>(ordenesMock);

  const handleAceptarPedido = (pedido: Pedido) => {
    const nuevaOrden: OrdenDeTrabajo = {
      id: ordenes.length + 1,
      cliente: `Cliente pedido ${pedido.idPedido}`,
      producto: pedido.productos.map((producto) => producto.nombre).join(", "),
      cantidad: pedido.productos.reduce((total, producto) => total + producto.cantidad, 0),
      fechaEntrega: pedido.fechaEntrega.split("T")[0],
      estado: "Pendiente",
    };

    setOrdenes((prev) => [...prev, nuevaOrden]);
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      <Header />
      <main className="p-6 space-y-6">
        <TablaPedidos pedidos={pedidosMock} onAceptar={handleAceptarPedido} />
        <TablaOT ordenes={ordenes} lineas={lineasMock} materiasPrimas={materiasMock} />
      </main>
    </div>
  );
};

export default OrdenesDeTrabajoPage;
