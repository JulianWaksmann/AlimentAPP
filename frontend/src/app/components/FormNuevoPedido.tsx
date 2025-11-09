"use client";
import React, { useEffect, useState } from "react";
import { Producto } from "app/models/Producto";
import { Cliente } from "app/models/Cliente";
import { GetNombreProductos } from "../api/productos";
import { GetNombreApellidoClientes } from "../api/clientes";
import { CreateNuevoPedido } from "../api/pedidosVenta";

interface ProductoPedido {
  id: number;
  nombre: string;
  cantidad: number;
}

const FormNuevoPedido = () => {
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState<"error"|"success">("error");
  // --- Estados del formulario ---
  const [nombreProductos, setNombreProductos] = useState<Producto[]>([]);
  const [nombreClientes, setNombreClientes] = useState<Cliente[]>([]);

  const [idCliente, setIdCliente] = useState<string>("");
  const [direccion, setDireccion] = useState<string>("");
  const [fechaEntrega, setFechaEntrega] = useState<string>("");
  const [productosPedido, setProductosPedido] = useState<ProductoPedido[]>([]);
  const [comentario, setComentario] = useState<string>("");
  // const today = new Date().toISOString().split("T")[0];
  const today = new Date();
const twoWeeksLater = new Date(today);
twoWeeksLater.setDate(today.getDate() + 14);
const formattedDate = twoWeeksLater.toISOString().split("T")[0];


  useEffect(() => {
    const fetchClientes = async () => {
      const clientes= await GetNombreApellidoClientes();
      // console.log(clientes);
        setNombreClientes(clientes);
    };
    fetchClientes();
  }, []);


  useEffect(() => {
    const fetchProductos = async () => {
      const productos = await GetNombreProductos();
      setNombreProductos(productos);
    };
    fetchProductos();
  }, []);
    
  // --- Estado para el producto que se está agregando ---
  const [productoActual, setProductoActual] = useState<{
    id: string;
    cantidad: string;
  }>({ id: "", cantidad: "" });

  // --- Manejadores de eventos ---
  const handleAgregarProducto = () => {
    const productoSeleccionado = nombreProductos.find(
      (p) => p.id === Number(productoActual.id),
    );
    const cantidad = Number(productoActual.cantidad);

    if (!productoSeleccionado || !cantidad || cantidad <= 0) {
      setModalMsg("Por favor, selecciona un producto y una cantidad válida.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    if (cantidad > 100) {
      setModalMsg("La cantidad máxima permitida es 100.");
      setModalType("error");
      setModalOpen(true);
      return;
    }

    // Evitar duplicados
    if (productosPedido.some((p) => p.id === productoSeleccionado.id)) {
      setModalMsg("El producto ya ha sido agregado. Puedes editarlo o eliminarlo.");
      setModalType("error");
      setModalOpen(true);
      return;
    }

    setProductosPedido([
      ...productosPedido,
      {
        id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        cantidad: cantidad,
      },
    ]);

    // Limpiar inputs de producto
    setProductoActual({ id: "", cantidad: "" });
  };

  const handleEliminarProducto = (idProducto: number) => {
    setProductosPedido(productosPedido.filter((p) => p.id !== idProducto));
  };

  const limpiarFormulario = () => {
    setIdCliente("");
    setFechaEntrega("");
    setProductosPedido([]);
    setProductoActual({ id: "", cantidad: "" });
    setComentario("");

  };

  const handleGuardar = async () => {
    if (!idCliente || !fechaEntrega || productosPedido.length === 0) {
      setModalMsg("Completa todos los campos antes de guardar.");
      setModalType("error");
      setModalOpen(true);
      return;
    }

    const nuevoPedido = {
      id_cliente: Number(idCliente),
      id_vendedor: 1,
      productos: productosPedido.map(p => ({
        id_producto: p.id,
        cantidad: p.cantidad,
      })),
      fecha_entrega_solicitada: fechaEntrega,
      comentario: comentario,
      con_envio: true
    };
      limpiarFormulario();

    try{
      // Llamar a la función para crear el nuevo pedido
      await CreateNuevoPedido(nuevoPedido);
      setModalMsg("Pedido creado con éxito.");
      setModalType("success");
      setModalOpen(true);
    }catch(error){
      console.error("Error al crear el pedido:", error);
      setModalMsg("Hubo un error al crear el pedido. Por favor, intenta nuevamente.");
      setModalType("error");
      setModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-4 shadow-lg md:p-6 relative">
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className={`rounded-lg p-6 shadow-lg w-80 text-center ${modalType === "error" ? "bg-red-50 border border-red-300" : "bg-green-50 border border-green-300"}`}>
            <h3 className={`text-lg font-bold mb-2 ${modalType === "error" ? "text-red-600" : "text-green-600"}`}>{modalType === "error" ? "Error" : "Éxito"}</h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button onClick={() => setModalOpen(false)} className={`px-4 py-2 rounded font-semibold ${modalType === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"} hover:opacity-90 transition`}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      <h2 className="mb-6 text-center text-xl font-bold text-primary">
        Formulario de Nuevo Pedido
      </h2>

      {/* --- Datos Generales del Pedido --- */}
      <div className="grid grid-cols-1 gap-4 ">
        <div>
          <label htmlFor="cliente" className="mb-1 block text-sm font-medium">Cliente</label>
          <select id="cliente" value={idCliente} onChange={(e) => setIdCliente(e.target.value)} className="w-full rounded border px-3 py-2">
            <option value="" disabled>Selecciona un cliente</option>
            {nombreClientes.map((c) => (
              <option key={c.id} value={c.id}>{c.id + " - " + c.nombre_contacto + " " + c.apellido_contacto + " - " + c.razon_social + " - " + c.cuil}</option>
            ))}
          </select>
          {/* <select  id="direccion" value={} ></select> */}
        </div>
        <div>
          <label htmlFor="fechaEntrega" className="mb-1 block text-sm font-medium">Fecha de entrega <span className="text-xs text-gray-600">(Las fecha de entrega debe ser al menos dos semanas después de la fecha actual)</span></label>
          <input id="fechaEntrega" type="date" min={formattedDate} value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full rounded border px-3 py-2" />
        </div>
      </div>  

      {/* --- Sección para Agregar Productos --- */}
      <div className="mt-6 rounded border border-details p-4">
        <h3 className="mb-3 text-lg font-semibold">Agregar Productos</h3>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-grow">
            <label htmlFor="producto" className="mb-1 block text-sm font-medium">Producto</label>
            <select id="producto" value={productoActual.id} onChange={(e) => setProductoActual({ ...productoActual, id: e.target.value })} className="w-full rounded border px-3 py-2">
              <option value="" disabled>Selecciona un producto</option>
              {nombreProductos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label htmlFor="cantidad" className="mb-1 block text-sm font-medium">Cantidad</label>
            <input id="cantidad" type="number" min="1" max="100" placeholder="Cant." value={productoActual.cantidad} onChange={(e) => setProductoActual({ ...productoActual, cantidad: e.target.value })} className="w-full rounded border px-3 py-2" />
          </div>
          <button onClick={handleAgregarProducto} className="rounded bg-primary px-4 py-2 text-white transition hover:opacity-90">
            + Agregar
          </button>
        </div>
      </div>

      {/* --- Lista de Productos Agregados --- */}
      {productosPedido.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-lg font-semibold">Productos en el Pedido</h3>
          <ul className="space-y-2">
            {productosPedido.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded bg-neutral-light p-2">
                <span>{p.nombre} - <strong>Cantidad: {p.cantidad}</strong></span>
                <button onClick={() => handleEliminarProducto(p.id)} className="text-sm text-red-600 hover:text-red-800">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>

      </div>
      <div className="mt-6 rounded border border-details p-4">
        <label htmlFor="fechaEntrega" className="mb-1 block text-sm font-medium"> Comentario </label>
        <textarea id="comentario" className="w-full rounded border px-3 py-2" rows={3} placeholder="Agrega un comentario adicional (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)}></textarea>

      </div>
      {/* --- Botones de Acción --- */}
      <div className="mt-8 flex justify-end gap-3">
        <button onClick={limpiarFormulario} className="rounded bg-neutral-dark px-6 py-2 text-white transition hover:opacity-90">
          Cancelar
        </button>
        <button onClick={handleGuardar} className="rounded bg-success px-6 py-2 text-white transition hover:opacity-90">
          Guardar
        </button>
      </div>
    </div>
  );
};

export default FormNuevoPedido;