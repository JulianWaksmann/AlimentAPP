"use client";

import React, { useState } from "react";
import pedidosData from "@/data/pedidosVenta.json";
import PedidoVentaTable, { PedidoVenta, Producto, EstadoPedido } from "@/app/components/PedidoDeVenta";

type NuevoPedido = {
  idCliente: number | "";
  productos: Producto[];
  fechaEntrega: string;
};

const GestionVentasPage = () => {
  const pedidosIniciales: PedidoVenta[] = pedidosData.map((pedido) => ({
    ...pedido,
    estado: pedido.estado as EstadoPedido,
  }));
  const [pedidos, setPedidos] = useState<PedidoVenta[]>(pedidosIniciales);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoPedido, setNuevoPedido] = useState<NuevoPedido>({
    idCliente: "",
    productos: [],
    fechaEntrega: "",
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNuevoPedido((prev) => ({
      ...prev,
      [name]: name === "idCliente" ? Number(value) : value,
    }));
  };

  const handleAgregarProducto = (producto: Producto) => {
    setNuevoPedido((prev) => ({
      ...prev,
      productos: [...prev.productos, producto],
    }));
  };

  const guardarNuevoPedido = () => {
    if (
      nuevoPedido.idCliente !== "" &&
      nuevoPedido.productos.length > 0 &&
      nuevoPedido.fechaEntrega
    ) {
      const siguienteId = pedidos.length > 0 ? pedidos[pedidos.length - 1].idPedido + 1 : 1;
      const pedido: PedidoVenta = {
        idPedido: siguienteId,
        idVendedor: 123,
        idCliente: nuevoPedido.idCliente as number,
        productos: nuevoPedido.productos,
        fechaPedido: new Date().toISOString(),
        fechaEntrega: nuevoPedido.fechaEntrega,
        estado: "SOLICITADO",
      };

      setPedidos((prev) => [...prev, pedido]);
      setMostrarFormulario(false);
      setNuevoPedido({ idCliente: "", productos: [], fechaEntrega: "" });
    } else {
      alert("Completa todos los campos para crear el pedido.");
    }
  };

  const cancelarNuevoPedido = () => {
    setMostrarFormulario(false);
    setNuevoPedido({ idCliente: "", productos: [], fechaEntrega: "" });
  };

  return (
    <div className="min-h-screen bg-neutral-light p-6 space-y-6">
      <button
        className="rounded bg-success px-4 py-2 font-semibold text-white transition hover:opacity-90"
        onClick={() => setMostrarFormulario(true)}
      >
        Agregar nuevo pedido
      </button>

      {mostrarFormulario && (
        <div className="max-w-3xl rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Nuevo pedido</h2>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">ID Cliente</label>
            <input
              name="idCliente"
              type="number"
              value={nuevoPedido.idCliente}
              onChange={handleInputChange}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Fecha de entrega</label>
            <input
              name="fechaEntrega"
              type="date"
              value={nuevoPedido.fechaEntrega}
              onChange={handleInputChange}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>

          <AgregarProductoForm
            onAgregar={handleAgregarProducto}
            productosAgregados={nuevoPedido.productos}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={cancelarNuevoPedido}
              className="rounded bg-neutral-dark px-4 py-2 text-white transition hover:opacity-90"
            >
              Cancelar
            </button>
            <button
              onClick={guardarNuevoPedido}
              className="rounded bg-success px-4 py-2 text-white transition hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <PedidoVentaTable pedidos={pedidos} />
    </div>
  );
};

interface AgregarProductoFormProps {
  onAgregar: (producto: Producto) => void;
  productosAgregados: Producto[];
}

const AgregarProductoForm: React.FC<AgregarProductoFormProps> = ({ onAgregar, productosAgregados }) => {
  const [producto, setProducto] = useState<{
    idProducto: number | "";
    nombre: string;
    cantidad: number | "";
  }>({
    idProducto: "",
    nombre: "",
    cantidad: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProducto((prev) => ({
      ...prev,
      [name]: name === "cantidad" || name === "idProducto" ? Number(value) : value,
    }));
  };

  const handleAgregar = () => {
    if (producto.idProducto && producto.nombre && producto.cantidad && producto.cantidad > 0) {
      onAgregar({
        idProducto: producto.idProducto as number,
        nombre: producto.nombre,
        cantidad: producto.cantidad as number,
      });
      setProducto({ idProducto: "", nombre: "", cantidad: "" });
    } else {
      alert("Completa todos los datos del producto.");
    }
  };

  return (
    <div className="rounded border border-details p-4">
      <h3 className="mb-3 text-base font-semibold">Agregar producto</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="number"
          name="idProducto"
          placeholder="ID producto"
          value={producto.idProducto}
          onChange={handleChange}
          className="flex-1 min-w-[140px] rounded border px-3 py-2"
        />
        <input
          type="text"
          name="nombre"
          placeholder="Nombre"
          value={producto.nombre}
          onChange={handleChange}
          className="flex-[2] min-w-[180px] rounded border px-3 py-2"
        />
        <input
          type="number"
          name="cantidad"
          placeholder="Cantidad"
          value={producto.cantidad}
          onChange={handleChange}
          min={1}
          className="flex-1 min-w-[120px] rounded border px-3 py-2"
        />
        <button
          onClick={handleAgregar}
          className="rounded bg-primary px-4 py-2 text-white transition hover:opacity-90"
          type="button"
        >
          + Agregar
        </button>
      </div>
      {productosAgregados.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {productosAgregados.map((item, index) => (
            <li key={`${item.idProducto}-${index}`}>
              {item.nombre} (ID {item.idProducto}) - Cantidad {item.cantidad}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GestionVentasPage;


