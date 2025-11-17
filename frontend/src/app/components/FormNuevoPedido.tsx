"use client";
import React, { useEffect, useState } from "react";
import { Producto } from "app/models/Producto";
import { Cliente } from "app/models/Cliente";
import { GetNombreProductos } from "../api/productos";
import { GetNombreApellidoClientes } from "../api/clientes";
import { crearDireccion, CreateNuevoPedido } from "../api/pedidosVenta";
import { NuevoPedido } from "../api/pedidosVenta";

interface ProductoPedido {
  id: number;
  nombre: string;
  cantidad: number;
}

export type IdDireccion = {
  id_direccion: number;
  // direccion_normalizada: string;
 
}

const FormNuevoPedido = () => {
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [modalType, setModalType] = useState<"error" | "success">("error");
  // --- Estados del formulario ---
  const [nombreProductos, setNombreProductos] = useState<Producto[]>([]);

  const [ClientesLista, setClientesLista] = useState<Cliente[]>([]);

  const [idClienteSeleccionado, setIdClienteSeleccionado] = useState<
    number | null
  >(null);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);

  const [fechaEntrega, setFechaEntrega] = useState<string>("");
  const [productosPedido, setProductosPedido] = useState<ProductoPedido[]>([]);
  const [comentario, setComentario] = useState<string>("");

  const [idDireccionSeleccionada, setIdDireccionSeleccionada] = useState<
    number | null
  >(null);
  // const [nuevaDireccion, setNuevaDireccion] = useState<string>("");
  // const [zonaNuevaDireccion, setZonaNuevaDireccion] = useState<string>("");
  const [nuevaCalle, setNuevaCalle] = useState<string>("");
  const [nuevoNumero, setNuevoNumero] = useState<string>("");
  const [nuevaCiudad, setNuevaCiudad] = useState<string>("");
  const [nuevaProvincia, setNuevaProvincia] = useState<string>("");
  const [IDDireccionNueva, setIDDireccionNueva] = useState<IdDireccion | null>(null);

  const [conEnvio, setConEnvio] = useState<boolean>(false);

  // const [SeleccionoEnvioNuevaDireccion, setSeleccionoEnvioNuevADireccion] =    useState<boolean>(false);
  const [abrirModalNuevaDireccion, setAbrirModalNuevaDireccion] =
    useState<boolean>(false);
  const [urgente, setUrgente] = useState<boolean>(false);
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 2);
  const formattedDate = twoWeeksLater.toISOString().split("T")[0];

  //traigo los clientes posibles para el pedido
  useEffect(() => {
    const fetchClientes = async () => {
      const clientes = await GetNombreApellidoClientes();
      // console.log(clientes);
      setClientesLista(clientes);
    };
    fetchClientes();
  }, [IDDireccionNueva]);

  //traigo los productos posibles para elegir
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
      (p) => p.id === Number(productoActual.id)
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
      setModalMsg(
        "El producto ya ha sido agregado. Puedes editarlo o eliminarlo."
      );
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

  //guarda el cliente seleccionado
  useEffect(() => {
    if (idClienteSeleccionado) {
      const cliente =
        ClientesLista.find((c) => c.id === idClienteSeleccionado) || null;
      setClienteSeleccionado(cliente);
      console.log("limpi id direccion");
      setIdDireccionSeleccionada(null);
      // setNuevaDireccion("");
      // setZonaNuevaDireccion("");
    } else {
      setClienteSeleccionado(null);
    }
  }, [idClienteSeleccionado, ClientesLista]);

  const limpiarFormulario = () => {
    setIdClienteSeleccionado(null);
    // setIdCliente("");
    setFechaEntrega("");
    setProductosPedido([]);
    setProductoActual({ id: "", cantidad: "" });
    setComentario("");
    setConEnvio(false);
    setIdDireccionSeleccionada(null);
    // setNuevaDireccion("");
    // setZonaNuevaDireccion("");
  };

  const verificarDireccion = async () => {
    if(!nuevaCalle || !nuevoNumero || !nuevaCiudad || !nuevaProvincia){
      setModalMsg("Por favor, completa todos los campos de la nueva dirección.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    try{
    const response = await crearDireccion(nuevaCalle, nuevoNumero, nuevaCiudad, nuevaProvincia, idClienteSeleccionado ? idClienteSeleccionado : 0);
    console.log("Respuesta de crearDireccion:", response);
    setIDDireccionNueva(response);
    console.log(response);
    setModalMsg("Direccion creada con éxito.");
      setModalType("success");
      setModalOpen(true);
      // setAbrirModalNuevaDireccion(false);
    } catch (error) {
      console.error("Error al crear la direccion:", error);
      setModalMsg(
        "Hubo un error al crear la direccion. Por favor, intenta nuevamente."
      );
      setModalType("error");
      setModalOpen(true);
    }
  }


  const handleGuardar = async () => {
    // if (!idCliente || !fechaEntrega || productosPedido.length === 0) {
    //   setModalMsg("Completa todos los campos antes de guardar.");
    //   setModalType("error");
    //   setModalOpen(true);
    //   return;
    // }
    if (!idClienteSeleccionado) {
      //no hay cliente seleccionado
      setModalMsg("Debe seleccionar un cliente antes de continuar.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    if (!fechaEntrega) {
      //no se asigno fecha
      setModalMsg("Debe asignar una fecha de entrega.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    if (productosPedido.length === 0) {
      //no hay productos en el pedido

      setModalMsg("Debe agregar al menos un producto al pedido.");
      setModalType("error");
      setModalOpen(true);
      return;
    }
    if (
      conEnvio &&
      // !SeleccionoEnvioNuevaDireccion &&
      !idDireccionSeleccionada
    ) {
      setModalMsg("Selecciona una dirección de envío o agrega una nueva.");
      setModalType("error");
      setModalOpen(true);
      return;
    }

    const nuevoPedido: NuevoPedido = {
      id_cliente: Number(idClienteSeleccionado),
      id_vendedor: 1,
      fecha_entrega_solicitada: fechaEntrega,
      productos: productosPedido.map((p) => ({
        id_producto: p.id,
        cantidad: p.cantidad,
      })),
      comentario: comentario,
      con_envio: conEnvio,
      id_direccion_entrega: idDireccionSeleccionada
        ? idDireccionSeleccionada
        : undefined,
      // direccion_nueva_opcional: SeleccionoEnvioNuevaDireccion? nuevaDireccion: undefined,
      // direccion_nueva_opcional: undefined,
      // zona: SeleccionoEnvioNuevaDireccion ? zonaNuevaDireccion : undefined,
      // zona: undefined,
      prioritario: urgente,
    };
    // limpiarFormulario();

    try {
      // Llamar a la función para crear el nuevo pedido
      console.log("Datos del nuevo pedido a enviar:", nuevoPedido);
      await CreateNuevoPedido(nuevoPedido);
      setModalMsg("Pedido creado con éxito.");
      setModalType("success");
      setModalOpen(true);
    } catch (error) {
      console.error("Error al crear el pedido:", error);
      setModalMsg(
        "Hubo un error al crear el pedido. Por favor, intenta nuevamente."
      );
      setModalType("error");
      setModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-4 shadow-lg md:p-6 relative">
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className={`rounded-lg p-6 shadow-lg w-80 text-center ${modalType === "error"
                ? "bg-red-50 border border-red-300"
                : "bg-green-50 border border-green-300"
              }`}
          >
            <h3
              className={`text-lg font-bold mb-2 ${modalType === "error" ? "text-red-600" : "text-green-600"
                }`}
            >
              {modalType === "error" ? "Error" : "Éxito"}
            </h3>
            <p className="mb-4 text-sm">{modalMsg}</p>
            <button
              onClick={() => setModalOpen(false)}
              className={`px-4 py-2 rounded font-semibold ${modalType === "error"
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-white"
                } hover:opacity-90 transition`}
            >
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
          <label htmlFor="cliente" className="mb-1 block text-sm font-medium">
            Cliente
          </label>
          <select
            id="cliente"
            value={Number(idClienteSeleccionado)}
            onChange={(e) => {
              setIdClienteSeleccionado(Number(e.target.value));
              console.log(idClienteSeleccionado);
            }}
            className="w-full rounded border px-3 py-2"
          >
            <option value={0} key={""} disabled>
              Selecciona un cliente
            </option>
            {ClientesLista.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id +
                  " - " +
                  c.nombre_contacto +
                  " " +
                  c.apellido_contacto +
                  " - " +
                  c.razon_social +
                  " - " +
                  c.cuil}
              </option>
            ))}
          </select>
        </div>
        {/* check envio o no */}
        <div className="flex mt-4">
          <input
            type="checkbox"
            checked={conEnvio}
            onChange={(e) => setConEnvio(e.target.checked)}
            className=""
          />
          <label className="ml-2"> Requiere Envío</label>
        </div>

        {/* SELECCION DE DIRECCION */}
        {idClienteSeleccionado && clienteSeleccionado && conEnvio && (
          <div className="mt-4">
            <label htmlFor="cliente" className="mb-1 block text-sm font-medium">
              Seleccionar dirección
            </label>
            {/* {!SeleccionoEnvioNuevaDireccion && ( */}
              <div className="flex">
                <select
                  id="direccion"
                  value={idDireccionSeleccionada || ""}
                  className="w-full rounded border px-3 py-2"
                  onChange={(e) => {
                    setIdDireccionSeleccionada(Number(e.target.value));
                  }}
                >
                  <option value={""} disabled className="text-black">
                    Selecciona una dirección
                  </option>
                  {clienteSeleccionado.direcciones_asociadas &&
                    clienteSeleccionado.direcciones_asociadas.map((dir) => (
                      <option key={dir.id_direccion} value={dir.id_direccion}>
                        {dir.id_direccion} - {dir.direccion_text} - {dir.zona}{" "}
                      </option>
                    ))}
                    {/* {IDDireccionNueva !== null && (
                      <option
                        key={IDDireccionNueva.id_direccion}
                        value={IDDireccionNueva.id_direccion}
                      >
                        {IDDireccionNueva.id_direccion} - {nuevaCalle} {nuevoNumero} , {nuevaCiudad} , {nuevaProvincia}
                      </option>
                    )} */}
                </select>
                <button
                  type="button"
                  className="ml-2 text-sm border rounded bg-primary text-white px-4 py-2"
                  onClick={() => setAbrirModalNuevaDireccion(true)}
                >
                  +Agregar
                </button>
              </div>
            {/* )} */}
          </div>
        )}

        {/* agregar nueva direccion */}
        {abrirModalNuevaDireccion && conEnvio && (
          
          <div className="border p-4 mt-4 rounded bg-neutral-light">
            <div className="">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Calle
              </label>
              <input
                type="text"
                value={nuevaCalle}
                placeholder="Ingrese la nueva direccion"
                onChange={(e) => setNuevaCalle(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Numero
              </label>
              <input
                type="number"
                placeholder="Ingrese el numero"
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Ciudad
              </label>
              <input
                type="text"
                value={nuevaCiudad}
                placeholder="Ingrese la ciudad"
                onChange={(e) => setNuevaCiudad(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="nuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Provincia
              </label>
              <input
                type="text"
                value={nuevaProvincia}
                placeholder="Ingrese la provincia"
                onChange={(e) => setNuevaProvincia(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div className="mt-4">
              {/* <label
                htmlFor="zonaNuevaDireccion"
                className="mb-1 block text-sm font-medium"
              >
                Zona de la nueva dirección
              </label> */}
              {/* <select
                value={zonaNuevaDireccion}
                onChange={(e) => setZonaNuevaDireccion(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="" disabled>
                  Selecciona una zona
                </option>
                <option value="zona norte">Zona Norte</option>
                <option value="zona sur">Zona Sur</option>
                <option value="zona este">Zona Este</option>
                <option value="zona oeste">Zona Oeste</option>
              </select> */}
            </div>
            <button
              onClick={() => {
                // setSeleccionoEnvioNuevADireccion(false);
                setAbrirModalNuevaDireccion(false);
              }}
              className="mt-2 text-sm border rounded bg-error text-white px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setIdDireccionSeleccionada(null);
                // setSeleccionoEnvioNuevADireccion(true);
                setAbrirModalNuevaDireccion(false);
                verificarDireccion();
              }}
              className="mt-2 text-sm border rounded bg-success text-white px-4 py-2"
            >
              {" "}
              Aceptar
            </button>
          </div>
        )}

        {/* vista de la seleccion nueva ingresada */}
        {/* {SeleccionoEnvioNuevaDireccion && (
          <div className="border p-4 mt-4 rounded bg-neutral-light flex justify-between items-center">
            <label htmlFor="">
              Enviar a la direccion: {nuevaDireccion} - {zonaNuevaDireccion}
            </label>
            <button
              onClick={() => {
                setSeleccionoEnvioNuevADireccion(false);
                setNuevaDireccion("");
                setZonaNuevaDireccion("");
              }}
              className="mt-2 text-sm border rounded bg-error text-white px-4 py-2"
            >
              {" "}
              cancelar
            </button>
          </div>
        )} */}

        <div>
          <label
            htmlFor="fechaEntrega"
            className="mb-1 block text-sm font-medium"
          >
            Fecha de entrega{" "}
            <span className="text-xs text-gray-600">
              (Las fecha de entrega debe ser al menos dos semanas después de la
              fecha actual)
            </span>
          </label>
          <input
            id="fechaEntrega"
            type="date"
            min={formattedDate}
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex mt-4">
          <input
            type="checkbox"
            checked={urgente}
            onChange={(e) => setUrgente(e.target.checked)}
            className=" "
          />
          <label className="ml-2"> Pedido Prioritario (URGENTE)</label>
        </div>
      </div>

      {/* --- Sección para Agregar Productos --- */}
      <div className="mt-6 rounded border border-details p-4">
        <h3 className="mb-3 text-lg font-semibold">Agregar Productos</h3>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-grow">
            <label
              htmlFor="producto"
              className="mb-1 block text-sm font-medium"
            >
              Producto
            </label>
            <select
              id="producto"
              value={productoActual.id}
              onChange={(e) =>
                setProductoActual({ ...productoActual, id: e.target.value })
              }
              className="w-full rounded border px-3 py-2"
            >
              <option value="" disabled>
                Selecciona un producto
              </option>
              {nombreProductos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label
              htmlFor="cantidad"
              className="mb-1 block text-sm font-medium"
            >
              Cantidad
            </label>
            <input
              id="cantidad"
              type="number"
              min="1"
              max="100"
              placeholder="Cant."
              value={productoActual.cantidad}
              onChange={(e) =>
                setProductoActual({
                  ...productoActual,
                  cantidad: e.target.value,
                })
              }
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <button
            onClick={handleAgregarProducto}
            className="rounded bg-primary px-4 py-2 text-white transition hover:opacity-90"
          >
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
              <li
                key={p.id}
                className="flex items-center justify-between rounded bg-neutral-light p-2"
              >
                <span>
                  {p.nombre} - <strong>Cantidad: {p.cantidad}</strong>
                </span>
                <button
                  onClick={() => handleEliminarProducto(p.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div></div>
      <div className="mt-6 rounded border border-details p-4">
        <label
          htmlFor="fechaEntrega"
          className="mb-1 block text-sm font-medium"
        >
          {" "}
          Comentario{" "}
        </label>
        <textarea
          id="comentario"
          className="w-full rounded border px-3 py-2"
          rows={3}
          placeholder="Agrega un comentario adicional (opcional)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        ></textarea>
      </div>
      {/* --- Botones de Acción --- */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={limpiarFormulario}
          className="rounded bg-neutral-dark px-6 py-2 text-white transition hover:opacity-90"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          className="rounded bg-success px-6 py-2 text-white transition hover:opacity-90"
        >
          Guardar
        </button>
      </div>
    </div>
  );
};

export default FormNuevoPedido;
