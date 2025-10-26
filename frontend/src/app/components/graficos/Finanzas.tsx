"use client";
import { Finanza } from '@/app/models/Graficos';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
type Props = {
  finanzas: Finanza[];
};


const FinanzasStack: React.FC<Props> =({finanzas}) => {
    const data = finanzas ?? [];
  return (
    <BarChart
      style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 5,
        right: 0,
        left: 0,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="1 1" />
      <XAxis dataKey="fecha" />
      <YAxis width="auto" />
      <Tooltip />
      <Legend />
      <ReferenceLine y={0} stroke="#000" />
      <Bar dataKey="ingresos" fill="#82ca9d" />
      <Bar dataKey="costos" fill="#d71418" />
      {/* <Bar dataKey="ganancias" fill="#ffc658" /> */}
    </BarChart>
  );
};

export default FinanzasStack;
