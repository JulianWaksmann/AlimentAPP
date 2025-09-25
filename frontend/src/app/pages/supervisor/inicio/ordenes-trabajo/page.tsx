"use client";

import Header from "@/app/components/Header";
import TablaOT from "@/app/components/TablaOT";
import React, { useState } from "react";
import TablaPedidos from "@/app/components/SolicitudDeOT";

// ================== Tipos ==================
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

// ================== Mock Data ==================

// Mock de pedidos
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

// Mock de órdenes + líneas + materias primas
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
    id: 11,
    cliente: "Cliente 112",
    producto: "Producto C",
    cantidad: 10,
    fechaEntrega: "2025-09-15",
    estado: "Pendiente",
  },
];

const lineasMock: LineaProduccion[] = [
  { id: 1, nombre: "Línea 1", estado: "Disponible" },
  { id: 2, nombre: "Línea 2", estado: "Ocupada" },
];

const materiasMock: Record<number, MateriaPrima[]> = {
  1: [
    { id: 1, nombre: "Materia X", stock: 100, requerido: 50 },
    { id: 2, nombre: "Materia Y", stock: 40, requerido: 60 },
  ],
};

// ================== Página ==================
const OrdenesDeTrabajoPage = () => {
  const [ordenes, setOrdenes] = useState<OrdenDeTrabajo[]>(ordenesMock);

  const handleAceptarPedido = (pedido: Pedido) => {
    const nuevaOT: OrdenDeTrabajo = {
      id: ordenes.length + 1,
      cliente: `Cliente pedido ${pedido.idPedido}`,
      producto: pedido.productos.map((p) => p.nombre).join(", "),
      cantidad: pedido.productos.reduce((acc, p) => acc + p.cantidad, 0),
      fechaEntrega: pedido.fechaEntrega.split("T")[0],
      estado: "Pendiente",
    };

    setOrdenes([...ordenes, nuevaOT]);
  };

  return (
    <div>
      <Header />
      <div className="p-6">
        <TablaPedidos pedidos={pedidosMock} onAceptar={handleAceptarPedido} />
        <TablaOT
          ordenes={ordenes}
          lineas={lineasMock}
          materiasPrimas={materiasMock}
        />
      </div>
    </div>
  );
};

export default OrdenesDeTrabajoPage;



// "use client"
// import Header from "@/app/components/Header"
// import TablaOT from "@/app/components/TablaOT"
// import React, { useState } from "react";
// import TablaPedidos from "@/app/components/SolicitudDeOT";

// export const ordenes = [
//   {
//     id: 1,
//     cliente: "Cliente A",
//     producto: "Remera",
//     cantidad: 100,
//     fechaEntrega: "2025-09-30",
//     estado: "Pendiente",
//   },
//   {
//     id: 2,
//     cliente: "Cliente B",
//     producto: "Pantalón",
//     cantidad: 50,
//     fechaEntrega: "2025-10-05",
//     estado: "Pendiente",
//   },
// ];

// export const lineas = [
//   { id: 1, nombre: "Línea 1", estado: "Disponible" },
//   { id: 2, nombre: "Línea 2", estado: "Ocupada" },
// ];

// interface MateriaPrima {
//   id: number;
//   nombre: string;
//   stock: number;
//   requerido: number;
// }

// export const materiasPrimas: Record<number, MateriaPrima[]> = {
//   1: [
//     { id: 1, nombre: "Tela", stock: 120, requerido: 100 },
//     { id: 2, nombre: "Hilo", stock: 50, requerido: 30 },
//   ],
//   2: [
//     { id: 3, nombre: "Tela Denim", stock: 20, requerido: 50 },
//     { id: 4, nombre: "Botones", stock: 200, requerido: 50 },
//   ],
// };

// //SOLICITUDES DE ORDENES DE TRABAJO
// // Mock de pedidos
// const pedidosMock = [
//   {
//     idPedido: 103,
//     productos: [
//       { idProducto: 502, nombre: "Producto B", cantidad: 5 },
//       { idProducto: 504, nombre: "Producto D", cantidad: 2 },
//     ],
//     fechaPedido: "2025-09-13T09:15:00Z",
//     fechaEntrega: "2025-09-18T00:00:00Z",
//   },
//   {
//     idPedido: 104,
//     productos: [{ idProducto: 505, nombre: "Producto C", cantidad: 10 }],
//     fechaPedido: "2025-09-14T11:20:00Z",
//     fechaEntrega: "2025-09-20T00:00:00Z",
//   },
// ];

// // Mock de órdenes + líneas + materias primas
// const ordenesMock = [
//   { id: 1, cliente: "Cliente 1", producto: "Producto A", cantidad: 10, fechaEntrega: "2025-09-15", estado: "Pendiente" as const },
// ];
// const lineasMock = [
//   { id: 1, nombre: "Línea 1", estado: "Disponible" as const },
//   { id: 2, nombre: "Línea 2", estado: "Ocupada" as const },
// ];
// const materiasMock = {
//   1: [
//     { id: 1, nombre: "Materia X", stock: 100, requerido: 50 },
//     { id: 2, nombre: "Materia Y", stock: 40, requerido: 60 },
//   ],
// };




// const OrdenesDeTrabajoPage = () => {
//   const [ordenes, setOrdenes] = useState(ordenesMock);

//   const handleAceptarPedido = (pedido: any) => {
//     // 🔹 Al aceptar, lo convertimos en OT con estado "Pendiente"
//     const nuevaOT = {
//       id: ordenes.length + 1,
//       cliente: `Cliente pedido ${pedido.idPedido}`,
//       producto: pedido.productos.map((p: any) => p.nombre).join(", "),
//       cantidad: pedido.productos.reduce((acc: number, p: any) => acc + p.cantidad, 0),
//       fechaEntrega: pedido.fechaEntrega.split("T")[0],
//       estado: "Pendiente" as const,
//     };
//     setOrdenes([...ordenes, nuevaOT]);
//   };
//     return(
//         <div>
//         <Header/>
//     <div className="p-6">
//       <TablaPedidos pedidos={pedidosMock} onAceptar={handleAceptarPedido} />
//       <TablaOT ordenes={ordenes} lineas={lineas} materiasPrimas={materiasPrimas} />
//     </div>        </div>

//     );
// };

// export default OrdenesDeTrabajoPage;