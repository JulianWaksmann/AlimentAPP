import { EficienciaProduccion } from '@/app/models/Graficos';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// const data = [
// 	{
// 		fecha: '2025-05-20',
// 		producto: 'Empanadas de Carne',
// 		ordenes_finalizadas: 5,
// 		kilos_producidos: 120.0,
// 	},
// 	{
// 		fecha: '2025-05-20',
// 		producto: 'Empanadas de Pollo',
// 		ordenes_finalizadas: 3,
// 		kilos_producidos: 72.0,
// 	},
// 	{
// 		fecha: '2025-05-21',
// 		producto: 'Empanadas de Jamón y Queso',
// 		ordenes_finalizadas: 2,
// 		kilos_producidos: 50.0,
// 	},
// ];

// Agrupar datos por fecha


type Props = {
    data: EficienciaProduccion[];
};
const ProduccionGrafico: React.FC<Props> = ({data}) => {
    type GroupedItem = { fecha: string; [producto: string]: string | number };

const groupedData = data.reduce((acc: GroupedItem[], curr) => {
	const existing = acc.find(item => item.fecha === curr.fecha);
	if (existing) {
		existing[curr.producto] = ((existing[curr.producto] as number) || 0) + curr.cantidad_bultos;
	} else {
		acc.push({ fecha: curr.fecha, [curr.producto]: curr.cantidad_bultos });
	}
	return acc;
}, [] as GroupedItem[]);

// Convertir el objeto a un formato adecuado para Recharts
const finalData = groupedData.map(item => {
	return { ...item };
});

// Obtener tipos de productos únicos
const productosUnicos = Array.from(new Set(data.map(item => item.producto)));
	return (
		// <ResponsiveContainer width="100%" height="70%">
			<BarChart
                  style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
				data={finalData}
				margin={{
					top: 20,
					right: 0,
					left: 0,
					bottom: 5,
				}}
			>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="fecha" />
				<YAxis />
				<Tooltip />
				<Legend />
				{/* Crear una barra por cada tipo de producto */}
				{productosUnicos.map(producto => (
					<Bar key={producto} dataKey={producto} stackId="a" fill={getColor(producto)} />
				))}
			</BarChart>
		// </ResponsiveContainer>
	);
};

// Función para asignar colores a cada producto
const getColor = (producto: string) => {
	switch (producto) {
		case 'Milanesas de Pollo x6':
			return '#82ca9d';
		case 'Empanadas de Carne x12':
			return '#8884d8';
		case 'Hamburguesas Premium x4':
			return '#ffc658';
        case 'Pizza Muzzarella Grande x4':
            return '#ff8042';
        case 'Medallones de Merluza x8':
            return '#8dd1e1';
        case 'Sorrentinos de Ricota x24':
            return '#a4de6c';
        case 'Tarta de Verdura x6':
            return '#d0ed57';
		default:
			return '#000000'; // Color por defecto
	}
};

export default ProduccionGrafico;

// const ProducionGrafico = () => {
//   return (
//     <BarChart
//       style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
//       responsive
//       data={data}
//       margin={{
//         top: 20,
//         right: 0,
//         left: 0,
//         bottom: 5,
//       }}
//     >
//       <CartesianGrid strokeDasharray="3 3" />
//       <XAxis dataKey="fecha" />
//       <YAxis width="auto" />
//       <Tooltip />
//       <Legend />
//       {/* <Bar dataKey="producto" stackId="a" fill="#8884d8" /> */}
//       <Bar dataKey="kilos_producidos" stackId="a" fill="#82ca9d" />
//     </BarChart>
//   );
// };

// export default ProducionGrafico;
