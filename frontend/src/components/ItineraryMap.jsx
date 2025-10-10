import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { MapPin, Navigation, Clock, DollarSign } from 'lucide-react';

/**
 * Interactive Google Map showing all itinerary locations with markers
 */
export function ItineraryMap({ itinerary, selectedDay }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isLoaded = useGoogleMaps(apiKey);
  
  const [mapError, setMapError] = useState(null);
  const [localSelectedDay, setLocalSelectedDay] = useState(null); // null = "All Days"

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !itinerary) {
      console.log('⏳ [ItineraryMap] Waiting for:', {
        isLoaded,
        hasMapRef: !!mapRef.current,
        hasItinerary: !!itinerary
      });
      return;
    }

    initializeMap();
  }, [isLoaded, itinerary, localSelectedDay]);

  const initializeMap = async () => {
    try {
      console.log('🗺️ [ItineraryMap] Initializing map...');

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Get all activities with locations
      const allActivities = [];
      const days = localSelectedDay 
        ? itinerary.days.filter(d => d.dayNumber === localSelectedDay)
        : itinerary.days;

      days.forEach(day => {
        day.timeSlots?.forEach(slot => {
          slot.activities?.forEach(activity => {
            if (activity.location?.latitude && activity.location?.longitude) {
              allActivities.push({
                ...activity,
                day: day.dayNumber,
                timeSlot: slot.time
              });
            }
          });
        });
      });

      console.log(`📍 [ItineraryMap] Found ${allActivities.length} activities with locations`);

      if (allActivities.length === 0) {
        setMapError('No locations found in itinerary');
        return;
      }

      // Calculate center and bounds
      const bounds = new google.maps.LatLngBounds();
      allActivities.forEach(activity => {
        bounds.extend({
          lat: activity.location.latitude,
          lng: activity.location.longitude
        });
      });

      const center = bounds.getCenter();

      // Create map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: center.lat(), lng: center.lng() },
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        console.log('✅ [ItineraryMap] Map created');
      }

      // Fit bounds
      mapInstanceRef.current.fitBounds(bounds);

      // Create info window
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      // Add markers for each activity
      allActivities.forEach((activity, index) => {
        const marker = new google.maps.Marker({
          position: {
            lat: activity.location.latitude,
            lng: activity.location.longitude
          },
          map: mapInstanceRef.current,
          title: activity.name,
          label: {
            text: `${activity.day}`,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: getMarkerColor(activity.day),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          },
          animation: google.maps.Animation.DROP
        });

        // Create info window content
        const infoContent = createInfoWindowContent(activity);

        // Add click listener
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
      });

      console.log(`✅ [ItineraryMap] Added ${markersRef.current.length} markers`);

    } catch (error) {
      console.error('❌ [ItineraryMap] Error initializing map:', error);
      setMapError(error.message);
    }
  };

  const getMarkerColor = (dayNumber) => {
    const colors = [
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#06B6D4', // Cyan
    ];
    return colors[(dayNumber - 1) % colors.length];
  };

  const createInfoWindowContent = (activity) => {
    return `
      <div style="padding: 12px; max-width: 300px; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          ${activity.name}
        </h3>
        
        ${activity.imageUrl ? `
          <img 
            src="${activity.imageUrl}" 
            alt="${activity.name}"
            style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;"
            onerror="this.style.display='none'"
          />
        ` : ''}
        
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
            <span>📅</span>
            <span>Day ${activity.day} • ${activity.timeSlot}</span>
          </div>
          
          ${activity.category ? `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
              <span>🏷️</span>
              <span style="text-transform: capitalize;">${activity.category}</span>
            </div>
          ` : ''}
          
          ${activity.rating ? `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
              <span>⭐</span>
              <span>${activity.rating}/5</span>
            </div>
          ` : ''}
          
          ${activity.duration ? `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280;">
              <span>⏰</span>
              <span>${activity.duration}</span>
            </div>
          ` : ''}
          
          ${activity.estimatedCost ? `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #10b981;">
              <span>💰</span>
              <span>${activity.estimatedCost}</span>
            </div>
          ` : ''}
        </div>
        
        ${activity.description ? `
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #4b5563; line-height: 1.5;">
            ${activity.description.slice(0, 150)}${activity.description.length > 150 ? '...' : ''}
          </p>
        ` : ''}
        
        <a 
          href="https://www.google.com/maps/dir/?api=1&destination=${activity.location.latitude},${activity.location.longitude}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;"
        >
          <span>🧭</span>
          <span>Get Directions</span>
        </a>
      </div>
    `;
  };

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Google Maps API Key Missing
          </h3>
          <p className="text-sm text-gray-600">
            Please add VITE_GOOGLE_MAPS_API_KEY to your .env file
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {mapError}
          </h3>
          <p className="text-sm text-gray-600">
            Activities need location coordinates to be displayed on the map
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Day Filter Dropdown */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
        <h4 className="font-semibold text-sm text-gray-900 mb-3">Filter by Day</h4>
        
        {/* Dropdown */}
        <select
          value={localSelectedDay || ''}
          onChange={(e) => setLocalSelectedDay(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white cursor-pointer hover:border-purple-400 transition-colors"
        >
          <option value="" className="text-gray-900">All Days</option>
          {itinerary?.days?.map((day) => (
            <option key={day.dayNumber} value={day.dayNumber} className="text-gray-900">
              Day {day.dayNumber} - {day.title || `${day.timeSlots?.reduce((sum, slot) => sum + (slot.activities?.length || 0), 0) || 0} activities`}
            </option>
          ))}
        </select>

        <p className="text-xs text-gray-500 mt-3">
          💡 Click markers for details
        </p>
      </div>
    </div>
  );
}
