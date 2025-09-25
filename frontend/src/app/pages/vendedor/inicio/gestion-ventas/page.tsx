'use client';
import React, { useState } from "react";
import pedidosData from "../../../../../data/pedidosVenta.json";
import PedidoVentaTable, { PedidoVenta, Producto } from "@/app/components/PedidoDeVenta";

const GestionVentasPage = () => {
  const [pedidos, setPedidos] = useState<PedidoVenta[]>(pedidosData);
  const [mostrarFormNuevoPedido, setMostrarFormNuevoPedido] = useState(false);

  // Estado para el nuevo pedido
  const [nuevoPedido, setNuevoPedido] = useState<{
    idCliente: number | "";
    productos: Producto[];
    fechaEntrega: string;
  }>({
    idCliente: "",
    productos: [],
    fechaEntrega: "",
  });

  // Función para agregar un producto al nuevo pedido
  const agregarProducto = (producto: Producto) => {
    setNuevoPedido((prev) => ({
      ...prev,
      productos: [...prev.productos, producto],
    }));
  };

  // Función para manejar cambios en campos simples
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNuevoPedido((prev) => ({
      ...prev,
      [name]: name === "idCliente" ? Number(value) : value,
    }));
  };

  // Guardar nuevo pedido
  const guardarNuevoPedido = () => {
    if (
      nuevoPedido.idCliente !== "" &&
      nuevoPedido.productos.length > 0 &&
      nuevoPedido.fechaEntrega
    ) {
      const nuevo: PedidoVenta = {
        idPedido: pedidos.length > 0 ? pedidos[pedidos.length - 1].idPedido + 1 : 1,
        idVendedor: 123, // puede ser fijo o Aleatorio según tu lógica
        idCliente: nuevoPedido.idCliente,
        productos: nuevoPedido.productos,
        fechaPedido: new Date().toISOString(),
        fechaEntrega: nuevoPedido.fechaEntrega,
        estado: "SOLICITADO",
      };
      setPedidos((prev) => [...prev, nuevo]);
      setMostrarFormNuevoPedido(false);
      setNuevoPedido({ idCliente: "", productos: [], fechaEntrega: "" }); // resetear form
    } else {
      alert("Completa todos los campos para crear el pedido");
    }
  };

  // Cancelar nuevo pedido
  const cancelarNuevoPedido = () => {
    setMostrarFormNuevoPedido(false);
    setNuevoPedido({ idCliente: "", productos: [], fechaEntrega: "" });
  };

  return (
    <div className="min-h-screen bg-neutral-light p-6">
      <button
        className="px-4 py-2 my-5 bg-success text-white rounded"
        onClick={() => setMostrarFormNuevoPedido(true)}
      >
        Agregar nuevo pedido
      </button>

      {/* Formulario oculto o visible */}
      {mostrarFormNuevoPedido && (
        <div className="bg-white rounded p-4 shadow max-w-3xl">
          <h2 className="text-lg font-semibold mb-4">Nuevo Pedido</h2>
          <div className="mb-4">
            <label className="block mb-1">ID Cliente</label>
            <input
              name="idCliente"
              type="number"
              value={nuevoPedido.idCliente}
              onChange={handleInputChange}
              className="border p-2 rounded w-full"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Fecha Entrega</label>
            <input
              name="fechaEntrega"
              type="date"
              value={nuevoPedido.fechaEntrega}
              onChange={handleInputChange}
              className="border p-2 rounded w-full"
              required
            />
          </div>

          {/* Aquí deberías agregar el componente de agregar producto o inputs para productos y cantidad */}
          <AgregarProductoForm onAgregar={agregarProducto} productosAgregados={nuevoPedido.productos} />

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={cancelarNuevoPedido}
              className="bg-neutral-dark text-white px-4 py-2 rounded hover:opacity-90 transition"
            >
              Cancelar
            </button>
            <button
              onClick={guardarNuevoPedido}
              className="bg-success text-white px-4 py-2 rounded hover:opacity-90 transition"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <PedidoVentaTable pedidos={pedidos}/>
    </div>
  );
};

// Ejemplo básico de formulario para agregar productos al nuevo pedido
interface AgregarProductoFormProps {
  onAgregar: (producto: Producto) => void;
  productosAgregados: Producto[];
}
interface ProductoOption {
  idProducto: number;
  nombre: string;
}

const productosDisponibles: ProductoOption[] = [
  { idProducto: 501, nombre: "Producto A" },
  { idProducto: 502, nombre: "Producto B" },
  { idProducto: 503, nombre: "Producto C" },
  { idProducto: 504, nombre: "Producto D" },
  // añade más productos a gusto
];

interface AgregarProductoFormProps {
  onAgregar: (producto: Producto) => void;
  productosAgregados: Producto[];
}

const AgregarProductoForm: React.FC<AgregarProductoFormProps> = ({
  onAgregar,
  productosAgregados,
}) => {
  const [idProductoSeleccionado, setIdProductoSeleccionado] = useState<number | "">("");
  const [cantidad, setCantidad] = useState<number>(1);

  const handleAgregar = () => {
    if (
      idProductoSeleccionado !== "" &&
      cantidad > 0
    ) {
      const productoSeleccionado = productosDisponibles.find(
        (p) => p.idProducto === idProductoSeleccionado
      );
      if (productoSeleccionado) {
        onAgregar({
          idProducto: productoSeleccionado.idProducto,
          nombre: productoSeleccionado.nombre,
          cantidad,
        });
        setIdProductoSeleccionado("");
        setCantidad(1);
      }
    } else {
      alert("Selecciona un producto y cantidad válida");
    }
  };

  return (
    <div className="mb-4 ">
      <h3 className="font-semibold mb-2">Agregar Producto</h3>
      <div className="flex gap-2 mb-2 items-center">
        <select
          value={idProductoSeleccionado}
          onChange={(e) => setIdProductoSeleccionado(Number(e.target.value))}
          className="border p-2 rounded flex-1"
        >
          <option value="">Seleccione producto</option>
          {productosDisponibles.map((p) => (
            <option key={p.idProducto} value={p.idProducto}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="border p-2 rounded w-24"
          placeholder="Cantidad"
        />
        <button
          onClick={handleAgregar}
          className="bg-primary text-white px-4 rounded"
          type="button"
        >
          + Agregar
        </button>
      </div>

      {productosAgregados.length > 0 && (
        <ul className="list-disc list-inside">
          {productosAgregados.map((p, idx) => (
            <li key={`${p.idProducto}-${idx}`}>
              {p.nombre} (ID: {p.idProducto}) - Cantidad: {p.cantidad}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// const AgregarProductoForm: React.FC<AgregarProductoFormProps> = ({ onAgregar, productosAgregados }) => {
//   const [producto, setProducto] = useState<{ idProducto: number | ""; nombre: string; cantidad: number | "" }>({
//     idProducto: "",
//     nombre: "",
//     cantidad: "",
//   });

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setProducto((prev) => ({
//       ...prev,
//       [name]: name === "cantidad" || name === "idProducto" ? Number(value) : value,
//     }));
//   };

//   const handleAgregar = () => {
//     if (producto.idProducto && producto.nombre && producto.cantidad && producto.cantidad > 0) {
//       onAgregar({ idProducto: producto.idProducto, nombre: producto.nombre, cantidad: producto.cantidad });
//       setProducto({ idProducto: "", nombre: "", cantidad: "" });
//     } else {
//       alert("Completa todos los campos del producto");
//     }
//   };

//   return (
//     <div className="mb-4">
//       <h3 className="font-semibold mb-2">Agregar Producto</h3>
//       <div className="flex gap-2 mb-2">
//         <input
//           type="number"
//           name="idProducto"
//           placeholder="ID Producto"
//           value={producto.idProducto}
//           onChange={handleChange}
//           className="border p-2 rounded flex-1"
//         />
//         <input
//           type="text"
//           name="nombre"
//           placeholder="Nombre"
//           value={producto.nombre}
//           onChange={handleChange}
//           className="border p-2 rounded flex-2"
//         />
//         <input
//           type="number"
//           name="cantidad"
//           placeholder="Cantidad"
//           value={producto.cantidad}
//           onChange={handleChange}
//           min={1}
//           className="border p-2 rounded flex-1"
//         />
//         <button
//           onClick={handleAgregar}
//           className="bg-primary text-white px-4 rounded"
//           type="button"
//         >
//           + Agregar
//         </button>
//       </div>

//       {productosAgregados.length > 0 && (
//         <ul className="list-disc list-inside">
//           {productosAgregados.map((p, idx) => (
//             <li key={`${p.idProducto}-${idx}`}>
//               {p.nombre} (ID: {p.idProducto}) - Cantidad: {p.cantidad}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

export default GestionVentasPage;


// 'use client';
// import React, { useState, useEffect } from "react";
// import pedidosData from "../../../../../data/pedidosVenta.json";
// import PedidoVentaTable from "@/app/components/PedidoDeVenta";


// const GestionVentasPage = () => {



 
//   return (

//     <div className="min-h-screen bg-neutral-light p-6">
//       <button
//         className="px-4 py-2 my-5 bg-success text-white rounded"
//         // onClick={() => setModalNuevoClienteVisible(true)}
//       >
//         Agregar nuevo pedido
//       </button>

//       <PedidoVentaTable pedidos={pedidosData} />
//     </div>

//   );
// };


// export default GestionVentasPage;