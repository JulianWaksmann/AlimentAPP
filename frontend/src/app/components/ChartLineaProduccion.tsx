'use client';
import React, { useState } from "react";

interface EstadoCuadradito {
  color: string;
  descripcion: string;
}

interface ChartLineaProduccionProps {
  estados: EstadoCuadradito[];
  anchoMaximo?: number;
  sizeCuadrado?: number;
}

const coloresHex: Record<string, string> = {
  verde: "#22c55e",
  amarillo: "#eab308",
  rojo: "#ef4444",
  violeta: "#8b5cf6",
  gris: "#9ca3af",
};

const ChartLineaProduccion: React.FC<ChartLineaProduccionProps> = ({
  estados,
  anchoMaximo = 400,
  sizeCuadrado = 20,
}) => {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  return (
    <div
      className="bg-neutral-light p-4"
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        maxWidth: anchoMaximo,
        position: "relative",
        borderRadius: 12,
        boxShadow: "0 0 8px rgba(0,0,0,0.1)",
      }}
    >
      {estados.map((estado, index) => (
        <div
          key={index}
          style={{
            width: sizeCuadrado,
            height: sizeCuadrado,
            backgroundColor: coloresHex[estado.color] || "#ccc",
            borderRadius: 4,
            position: "relative",
            cursor: "pointer",
          }}
          onMouseEnter={() => setTooltipIndex(index)}
          onMouseLeave={() => setTooltipIndex(null)}
          onClick={() => setTooltipIndex((current) => (current === index ? null : index))}
          aria-label={estado.descripcion}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setTooltipIndex((current) => (current === index ? null : index));
            }
          }}
        >
          {tooltipIndex === index && (
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
