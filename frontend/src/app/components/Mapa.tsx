import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interfaz para cada punto del recorrido
export interface RoutePoint {
  sequence: number;
  envio_id: number;
  orden_venta_id: number;
  // id_orden: number;
  lat: number;
  lon: number;
}

// Interfaz para la respuesta de tu API
export interface ApiData {
  // count: number;
  ordered_points: RoutePoint[];
}

// Interfaz para la respuesta de OpenRouteService (simplificada para lo que necesitamos)
// Nos interesa el GeoJSON de la ruta
export interface OrsRouteResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number][]; // [lon, lat][]
      type: string;
    };
  }>;
}
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImEyZmE4YTA1MDJhYjQ0NGJiNGQ0NmRiNGNlMjhlMzVlIiwiaCI6Im11cm11cjY0In0=";

// Datos de ejemplo que recibirías de tu API
// const mockData: ApiData = {
//   "count": 4,
//   "ordered_points": [
//     {"sequence":0,"orden_venta_id":199,"lat":-34.521667, "lon":-58.701182, envio_id: 123},
//     {"sequence":1,"orden_venta_id":201,"lat":-34.498857,"lon":-58.677598, envio_id: 124},
//     {"sequence":2,"orden_venta_id":202,"lat":-34.481442,"lon":-58.669840, envio_id: 125},
//     {"sequence":3,"orden_venta_id":203,"lat":-34.459143,"lon":-58.682599, envio_id: 126}
//   ]
// };

// Define el color de la polilínea (la ruta)
const polylineOptions = { color: 'blue', weight: 4 };

// Define un icono de marcador personalizado (opcional)
// Esto soluciona problemas comunes de iconos en React-Leaflet
const customMarkerIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=vfv1AbUEfpHl&format=png&color=000000',
  iconRetinaUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icono distinto para el punto de inicio (puede usar otra imagen)
const startMarkerIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/?size=100&id=7880&format=png&color=221E5F',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Punto de inicio fijo
const START_POINT: RoutePoint = {
  sequence: 0,
  envio_id: -1,
  orden_venta_id: -1,
  // id_orden: -1,
  lat: -34.52271017111954,
  lon: -58.70043496251298
};

// Props del componente (podrías recibir los datos por props)
interface RouteMapProps {
  data: ApiData;
}

const Mapa: React.FC<RouteMapProps> = ({ data }) => {
  const [routeCoords, setRouteCoords] = useState<L.LatLngTuple[]>([]);
  
  // 1. Preparar las coordenadas de los puntos de la API
  // Las coordenadas de Leaflet son [lat, lon]
  // Reemplazar la obtención directa de apiPoints por una lista augmentada
  // que siempre incluye el START_POINT en sequence 0 y desplaza las secuencias existentes.
  const augmentedOrderedPoints = useMemo(() => {
    console.log("Puntos recibidos de la API:", data.ordered_points);
    if (!data.ordered_points || data.ordered_points.length === 0) {
      return [START_POINT];
    }
    const shifted = data.ordered_points.map(p => ({ ...p, sequence: p.sequence + 1 }));
    return [START_POINT, ...shifted];
  }, [data.ordered_points]);

  // Las coordenadas para Leaflet a partir de augmentedOrderedPoints
  const apiPoints: L.LatLngTuple[] = useMemo(() =>
    augmentedOrderedPoints.map(p => [p.lat, p.lon]),
    [augmentedOrderedPoints]
  );

  // 2. Obtener la ruta de OpenRouteService
  useEffect(() => {
    if (apiPoints.length < 2) {
      setRouteCoords([]);
      return;
    }
    // ORS requiere las coordenadas en formato [lon, lat]
    const orsCoordinates = augmentedOrderedPoints.map(p => [p.lon, p.lat]);

    const fetchRoute = async () => {

    try {
        const response = await fetch(
          'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
          {
            method: 'POST', 
            body: JSON.stringify({
              coordinates: orsCoordinates,
            }),
            headers: {
              'Authorization': ORS_API_KEY,
              'Content-Type': 'application/json'
            }
          }
        );

        // Verificar si la respuesta fue exitosa (código 200-299)
        if (!response.ok) {
            // Lanza un error si el servidor respondió con un código de error (ej. 401, 404, 500)
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        // Parsear la respuesta JSON
        const data: OrsRouteResponse = await response.json();
        // console.log("Respuesta de ORS:", data);

        // La geometría del GeoJSON viene en [lon, lat], hay que revertir a [lat, lon] para Leaflet.
        // Además, la respuesta de ORS ya puede ser una polilínea decodificada, solo la extraemos.
        const geometry = data.features[0].geometry.coordinates;
        
        // Convertir [lon, lat] de GeoJSON a [lat, lon] de Leaflet
        const leafletCoords: L.LatLngTuple[] = geometry.map(([lon, lat]) => [lat, lon]);
        
        setRouteCoords(leafletCoords);

      } catch (error) {
        console.error("Error al obtener la ruta de OpenRouteService:", error);
        setRouteCoords([]);
      }
    };

    fetchRoute();
  }, [augmentedOrderedPoints]); // <-- depende de la lista augmentada


  // 3. Calcular el centro del mapa
  // Usamos el primer punto como centro si no hay ruta aún, o el primer punto de la ruta.
  const mapCenter: L.LatLngTuple = routeCoords.length > 0 
    ? routeCoords[0]
    : apiPoints.length > 0 
      ? apiPoints[0] 
      : [-34.6037, -58.3816]; // Coordenadas por defecto (Buenos Aires)


  // 4. Renderizado del mapa
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true} // Permite hacer zoom con la rueda del mouse
      >
        {/* Capa base de Leaflet */}
          <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={20}
                />
        {/* <TileLayer
          attribution="© OpenMapTiles © OpenStreetMap"
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"
          maxZoom={20}
        /> */}

        {/* Polilínea de la Ruta de ORS */}
        {routeCoords.length > 0 && (
          <Polyline 
            positions={routeCoords} 
            pathOptions={polylineOptions} 
          />
        )}
        

        {/* Marcadores de los Puntos de la API */}
        {augmentedOrderedPoints.map((point: RoutePoint) => {
          const isStart = point.sequence === 0;
          const icon = isStart ? startMarkerIcon : customMarkerIcon;
          return (
            <Marker 
              key={point.sequence} 
              position={[point.lat, point.lon]} 
              icon={icon}
            >
              <Popup>
                {isStart ? <strong>Punto de inicio</strong> : <>Orden #{point.orden_venta_id}</>} <br />

                { !isStart && <>Entrega: {point.sequence-1}° <br /></> }
                {/* Lat: {point.lat.toFixed(6)}, Lon: {point.lon.toFixed(6)} */}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Mapa;

// Uso del componente (ej. en App.tsx)
/*
function App() {
  return (
    <div>
      <h1>Mapa de Recorrido</h1>
      <RouteMap data={mockData} />
    </div>
  );
}
*/