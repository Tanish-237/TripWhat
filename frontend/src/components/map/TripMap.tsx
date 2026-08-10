import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';

interface TripMapProps {
  itinerary: any;
  selectedCity?: string | null;
}

export function TripMap({ itinerary, selectedCity }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isLoaded = useGoogleMaps(apiKey);
  const [map, setMap] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;
    if (!window.google?.maps) return;

    const newMap = new window.google.maps.Map(mapRef.current, {
      zoom: 4,
      center: { lat: 35.6762, lng: 139.6503 },
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
        { featureType: 'road', stylers: [{ visibility: 'simplified' }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });

    setMap(newMap);
  }, [isLoaded, map]);

  useEffect(() => {
    if (!map || !isLoaded || !itinerary) return;
    const googleMaps = window.google.maps;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new googleMaps.LatLngBounds();
    const days = itinerary.days || [];

    days.forEach((day: any) => {
      if (selectedCity && day.location !== selectedCity) return;

      const timeSlots = day.timeSlots || [];
      timeSlots.forEach((slot: any) => {
        const activities = slot.activities || (slot.activity ? [slot.activity] : []);
        activities.forEach((act: any) => {
          if (act.coordinates) {
            const marker = new googleMaps.Marker({
              position: { lat: act.coordinates.lat, lng: act.coordinates.lng },
              map,
              title: act.name,
            });
            markersRef.current.push(marker);
            const pos = marker.getPosition();
            if (pos) bounds.extend(pos);
          }
        });
      });
    });

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [map, isLoaded, itinerary, selectedCity]);

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '300px' }} />;
}
