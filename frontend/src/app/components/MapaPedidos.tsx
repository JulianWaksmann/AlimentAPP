import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PedidosTerminados } from '../models/PedidosVentas';
import * as L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
 
// @ts-expect-error error por uso de marker personalizado para el mapa
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

type Props = {
  pedidos: PedidosTerminados[];
};


const MapaPedidos: React.FC<Props> = ({ pedidos }) => {
  // compute a sensible center: mean of all coords, fallback to a default
  const center: [number, number] = useMemo(() => {
    if (!pedidos || pedidos.length === 0) return [ -34.6037, -58.3816 ]; // Buenos Aires fallback
    const { sumLat, sumLng } = pedidos.reduce(
      (acc, p) => ({ sumLat: acc.sumLat + (p.latitud || 0), sumLng: acc.sumLng + (p.longitud || 0) }),
      { sumLat: 0, sumLng: 0 }
    );
    return [sumLat / pedidos.length, sumLng / pedidos.length];
  }, [pedidos]);

  // Group pedidos by rounded lat/lng key to handle multiple orders at same address
  const grouped = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; pedidos: PedidosTerminados[] }>();
    const precision = 6; // ~0.11 m precision for grouping — adjust if needed
    for (const p of pedidos || []) {
      const lat = Number(p.latitud) || 0;
      const lng = Number(p.longitud) || 0;
      const key = `${lat.toFixed(precision)}|${lng.toFixed(precision)}`;
      if (!map.has(key)) map.set(key, { lat, lng, pedidos: [p] });
      else map.get(key)!.pedidos.push(p);
    }
    return Array.from(map.values());
  }, [pedidos]);

  return (
    <div className="w-full h-96">
      <MapContainer center={center} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
                {/* Capa base de Leaflet */}
                {/* <TileLayer
                  attribution="© OpenMapTiles © OpenStreetMap"
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"
                  maxZoom={20}
                /> */}
        {grouped.map((g, idx) => (
          <Marker key={`${g.lat}-${g.lng}-${idx}`} position={[g.lat, g.lng]}>

            <Popup>
              <div className="max-w-xs">
                <strong>{g.pedidos.length} pedido{g.pedidos.length > 1 ? 's' : ''} en esta ubicación</strong>
                <ul className="mt-2 list-disc list-inside">
                  {g.pedidos.map((pedido) => (
                    <li key={pedido.id_pedido_venta}>
                      <div>
                        <div className="font-medium">{pedido.razon_social || pedido.nombre_contacto + ' ' + pedido.apellido_contacto}</div>
                        <div className="text-sm">ID: {pedido.id_pedido_venta} • ${pedido.valor_total_pedido}</div>
                        <div className="text-xs text-gray-600">{pedido.direccion_text}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapaPedidos;