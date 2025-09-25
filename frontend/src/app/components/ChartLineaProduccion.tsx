"use client";
import React, { useState } from "react";

interface EstadoCuadradito {
  color: string;// "verde" | "amarillo" | "rojo" | "violeta" | "gris";
  descripcion: string;
}

interface ChartLineaProduccionProps {
  estados: EstadoCuadradito[];
  anchoMaximo?: number; // opcional, para limitar ancho total
  sizeCuadrado?: number; // tamaño en px de cada cuadrado
}

const coloresHex: Record<string, string> = {
  verde: "#22c55e", // trabajando
  amarillo: "#eab308", // esperando materia prima
  rojo: "#ef4444", // detenido
  violeta: "#8b5cf6", // mantenimiento
  gris: "#9ca3af", // apagado
};

const ChartLineaProduccion: React.FC<ChartLineaProduccionProps> = ({
  estados,
  anchoMaximo = 400,
  sizeCuadrado = 20,
}) => {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  return (
    <div className="bg-neutral-light p-4 rounded-lg shadow-md"
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        maxWidth: anchoMaximo,
        position: "relative", 
      }}
    >
      {estados.map((estado, idx) => (
        <div
          className="mx-0"
          key={idx}
          style={{
            width: sizeCuadrado/2,
            height: sizeCuadrado,
            backgroundColor: coloresHex[estado.color] || "#ccc",
            borderRadius: 4,
            boxShadow: "0 0 4px rgba(0,0,0,0.1)",
            position: "relative",
            cursor: "pointer",
          }}
          onMouseEnter={() => setTooltipIndex(idx)}
          onMouseLeave={() => setTooltipIndex(null)}
          onClick={() =>
            setTooltipIndex((cur) => (cur === idx ? null : idx))
          }
          aria-label={estado.descripcion}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setTooltipIndex((cur) => (cur === idx ? null : idx));
            }
          }}
        >
          {tooltipIndex === idx && (
            <div
              style={{
                position: "absolute",
                bottom: "110%",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: "nowrap",
                zIndex: 1000,
                userSelect: "none",
              }}
            >
              {estado.descripcion}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChartLineaProduccion;
