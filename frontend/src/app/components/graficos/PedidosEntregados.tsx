"use client";
import { PedidosEntregados } from '@/app/models/Graficos';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Props = {
    data: PedidosEntregados[];
};

const PedidosEntregadosGrafico: React.FC<Props> = ({data}) => {
  return (
    <BarChart
      style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 20,
        right: 0,
        left: 0,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="fecha" />
      <YAxis width="auto" />
      <Tooltip />
      <Legend />
      <Bar dataKey="tarde" stackId="a" fill="#cc303a" />
      <Bar dataKey="a_tiempo" stackId="a" fill="#82dd9d" />
    </BarChart>
  );
};

export default PedidosEntregadosGrafico;
