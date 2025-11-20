import { Finanza } from '@/app/models/Graficos';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Props = {
    Finanza: Finanza[];
  };
  
const GananciasChart: React.FC<Props> = ({Finanza}) => {
    const data = Finanza ?? [];
  return (
    <AreaChart
      style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 20,
        right: 0,
        left: 0,
        bottom: 0,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="fecha" />
      <YAxis width="auto" />
      <Tooltip />
      <Area type="monotone" dataKey="ganancias" stroke="#00D8C4" fill="#00D8C4" />
    </AreaChart>
  );
};

export default GananciasChart;
