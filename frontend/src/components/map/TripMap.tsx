import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TripMapProps {
  itinerary: any;
  selectedCity?: string | null;
  destination?: string | null;
}

const MARKER_COLORS = [
  '#EA580C', '#2563EB', '#16A34A', '#9333EA', '#DC2626',
  '#0891B2', '#CA8A04', '#DB2777', '#4F46E5', '#059669',
];

const CITY_COORDS: Record<string, [number, number]> = {
  tokyo: [139.6917, 35.6895], kyoto: [135.7681, 35.0116], osaka: [135.5023, 34.6937],
  paris: [2.3522, 48.8566], bali: [115.1889, -8.4095], japan: [138.2529, 36.2048],
  london: [-0.1276, 51.5074], newyork: [-74.006, 40.7128], 'new york': [-74.006, 40.7128],
  iceland: [-19.0222, 64.9631], reykjavik: [-21.9426, 64.1466], bangkok: [100.5018, 13.7563],
  rome: [12.4964, 41.9028], barcelona: [2.1734, 41.3851], amsterdam: [4.9041, 52.3676],
  berlin: [13.405, 52.52], sydney: [151.2093, -33.8688], seoul: [126.978, 37.5665],
  singapore: [103.8198, 1.3521], dubai: [55.2708, 25.2048], istanbul: [28.9784, 41.0082],
  prague: [14.4378, 50.0755], vienna: [16.3738, 48.2082], madrid: [-3.7038, 40.4168],
  lisbon: [-9.1393, 38.7223], athens: [23.7276, 37.9838], cairo: [31.2357, 30.0444],
  marrakech: [-7.9811, 31.6295], capetown: [18.4241, -33.9249], 'cape town': [18.4241, -33.9249],
  rio: [-43.1729, -22.9068], 'rio de janeiro': [-43.1729, -22.9068],
  mexicocity: [-99.1332, 19.4326], 'mexico city': [-99.1332, 19.4326],
  hanoi: [105.8342, 21.0278], saigon: [106.6297, 10.8231], hochiminh: [106.6297, 10.8231],
};

function lookupCityCoord(name: string): [number, number] | null {
  const key = name.toLowerCase().trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

export function TripMap({ itinerary, selectedCity, destination }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const lastDestRef = useRef<string | null>(null);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      zoom: 4,
      center: [0, 20],
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    mapRef.current = map;

    // Try to center on user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 10,
              speed: 1.0,
              essential: true,
            });
          }
        },
        () => {},
        { timeout: 5000 }
      );
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !itinerary) return;

    const addMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const days = itinerary.days || [];
      const bounds = new mapboxgl.LngLatBounds();
      let hasMarkers = false;

      days.forEach((day: any) => {
        if (selectedCity && day.location !== selectedCity) return;

        const colorIdx = ((day.dayNumber || 1) - 1) % MARKER_COLORS.length;
        const color = MARKER_COLORS[colorIdx];
        const timeSlots = day.timeSlots || [];

        timeSlots.forEach((slot: any) => {
          const activities = slot.activities || (slot.activity ? [slot.activity] : []);
          activities.forEach((act: any) => {
            if (act.coordinates && act.coordinates.lat != null && act.coordinates.lng != null) {
              const el = document.createElement('div');
              el.style.cssText = `
                width: 24px; height: 24px; border-radius: 50%;
                background: ${color}; border: 2px solid #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                cursor: pointer; display: flex; align-items: center;
                justify-content: center; font-size: 10px; color: #fff;
                font-weight: 600;
              `;
              el.textContent = String(day.dayNumber || '');

              const popup = new mapboxgl.Popup({ offset: 16, closeButton: false, closeOnClick: false });
              popup.setHTML(`
                <div style="font-family: Inter, sans-serif; padding: 4px 2px;">
                  <div style="font-size: 12px; font-weight: 600; color: #1C1917; margin-bottom: 2px;">${act.name}</div>
                  <div style="font-size: 11px; color: #78716C;">Day ${day.dayNumber} · ${day.location || ''}</div>
                </div>
              `);

              const marker = new mapboxgl.Marker(el)
                .setLngLat([act.coordinates.lng, act.coordinates.lat])
                .setPopup(popup)
                .addTo(map);

              el.addEventListener('mouseenter', () => popup.addTo(map));
              el.addEventListener('mouseleave', () => popup.remove());

              markersRef.current.push(marker);
              bounds.extend([act.coordinates.lng, act.coordinates.lat]);
              hasMarkers = true;
            }
          });
        });
      });

      if (hasMarkers) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.once('load', addMarkers);
    }
  }, [itinerary, selectedCity]);

  // Fly-to animation when destination changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destination || destination === lastDestRef.current) return;

    const coords = lookupCityCoord(destination);
    if (!coords) return;

    lastDestRef.current = destination;

    const doFlyTo = () => {
      map.flyTo({
        center: coords,
        zoom: 5,
        speed: 1.2,
        curve: 1.5,
        easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
        essential: true,
      });
    };

    if (map.loaded()) {
      doFlyTo();
    } else {
      map.once('load', doFlyTo);
    }
  }, [destination]);

  return <div ref={containerRef} className="w-full h-full" />;
}
