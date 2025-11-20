"use client";
import React, { useState, useMemo } from 'react';
import { MateriaPrima } from '../models/MateriaPrima';
import { ArrowUp, ArrowDown, Package, Beaker } from 'lucide-react';

type Props = {
  materiasPrimas: MateriaPrima[];
};

const StockMateriaPrimaTable: React.FC<Props> = ({ materiasPrimas }) => {
  const [sortKey, setSortKey] = useState<'nombre_materia_prima' | 'cantidad_disponible'>('nombre_materia_prima');
  const [sortAsc, setSortAsc] = useState(true);

  const sortedMateriasPrimas = useMemo(() => {
    const sorted = [...materiasPrimas].sort((a, b) => {
      if (sortKey === 'nombre_materia_prima') {
        return sortAsc
          ? a.nombre_materia_prima.localeCompare(b.nombre_materia_prima)
          : b.nombre_materia_prima.localeCompare(a.nombre_materia_prima);
      } else { // cantidad_disponible
        const valA = a.cantidad_disponible || 0;
        const valB = b.cantidad_disponible || 0;
        return sortAsc ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [materiasPrimas, sortKey, sortAsc]);

  const toggleSort = (key: 'nombre_materia_prima' | 'cantidad_disponible') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Stock de Materia Prima</h2>

      {/* Sort Controls */}
      <div className="flex justify-center items-center mb-4 gap-4">
        <button
          onClick={() => toggleSort('nombre_materia_prima')}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${sortKey === 'nombre_materia_prima' ? 'bg-success text-white' : 'bg-white'}`}
        >
          Ordenar por Nombre
          {sortKey === 'nombre_materia_prima' && (sortAsc ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
        </button>
        <button
          onClick={() => toggleSort('cantidad_disponible')}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${sortKey === 'cantidad_disponible' ? 'bg-success text-white' : 'bg-white'}`}
        >
          Ordenar por Cantidad
          {sortKey === 'cantidad_disponible' && (sortAsc ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
        </button>
      </div>

      {/* Materia Prima List (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedMateriasPrimas.map(mp => (
          <div key={mp.id_materia_prima} className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package size={24} className="text-primary" />
                <h3 className="font-bold text-lg text-gray-800 truncate">{mp.nombre_materia_prima}</h3>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                 <Beaker size={20} className="text-details" />
                 <p className="text-2xl font-semibold">{mp.cantidad_disponible?.toLocaleString() || '0'} <span className="text-base font-normal">{mp.unidad_medida}</span></p>
              </div>
            </div>
            <div className="text-right mt-2">
                <span className="text-xs text-gray-400">ID: {mp.id_materia_prima}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockMateriaPrimaTable;
