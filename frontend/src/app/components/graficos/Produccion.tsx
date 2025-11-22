import { EficienciaProduccion } from '@/app/models/Graficos';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';



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
		<div className="w-full">
			<div className="w-full h-[340px] sm:h-[420px]">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={finalData}
						margin={{
							top: 20,
							right: 8,
							left: 8,
							bottom: 5,
						}}
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="fecha" />
						<YAxis />
						<Tooltip />
						{/* Crear una barra por cada tipo de producto */}
						{productosUnicos.map(producto => (
							<Bar key={producto} dataKey={producto} stackId="a" fill={getColor(producto)} />
						))}
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Leyenda personalizada debajo del gráfico */}
			<div className="mt-3 px-2">
				<div className="flex flex-wrap justify-center gap-2 max-w-full overflow-x-auto py-2">
					{productosUnicos.map(producto => (
						<div key={producto} className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 px-3 py-1 rounded-md text-sm whitespace-nowrap">
							<span className="w-3 h-3 rounded" style={{ background: getColor(producto) }} />
							<span className="text-xs text-white">{producto}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

// Función para asignar colores a cada producto
const getColor = (producto: string) => {
	switch (producto) {
		case 'Milanesas de Pollo x6':
			return '#221E5F';
		case 'Empanadas de Carne x12':
			return '#8E01FB';
		case 'Hamburguesas Premium x4':
			return '#05ABFF';
        case 'Pizza Muzzarella Grande x4':
            return '#010119';
        case 'Medallones de Merluza x8':
            return '#00D8C4';
        case 'Sorrentinos de Ricota x24':
            return '#D1460F';
        case 'Tarta de Verdura x6':
            return '#FF8C00';
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
