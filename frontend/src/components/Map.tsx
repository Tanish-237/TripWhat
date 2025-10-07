import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Leaflet in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Location {
  lat: number;
  lon: number;
  name: string;
  description?: string;
}

interface MapProps {
  locations: Location[];
  center?: [number, number];
  zoom?: number;
}

// Component to update map view when locations change
function MapUpdater({ locations }: { locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      // Fit bounds to show all markers
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);

  return null;
}

export function Map({ locations, center = [48.8566, 2.3522], zoom = 13 }: MapProps) {
  // Use first location as center if available
  const mapCenter: [number, number] = locations.length > 0 
    ? [locations[0].lat, locations[0].lon]
    : center;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((location, index) => (
          <Marker key={index} position={[location.lat, location.lon]}>
            <Popup>
              <div className="text-sm">
                <strong className="text-base">{location.name}</strong>
                {location.description && (
                  <p className="mt-1 text-gray-600">{location.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        <MapUpdater locations={locations} />
      </MapContainer>
    </div>
  );
}
