import axios from 'axios';

/**
 * Transport and Distance API
 * Uses OpenRouteService (free API) for routing and distance calculations
 * Get free API key at: https://openrouteservice.org/dev/#/signup
 */

export interface DistanceResult {
  distance_km: number;
  duration_minutes: number;
  origin: { lat: number; lon: number; name: string };
  destination: { lat: number; lon: number; name: string };
}

export interface DirectionsResult {
  distance_km: number;
  duration_minutes: number;
  steps: Array<{
    instruction: string;
    distance_km: number;
    duration_minutes: number;
  }>;
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

export class TransportAPI {
  private apiKey: string;
  private baseURL = 'https://api.openrouteservice.org';

  constructor(apiKey?: string) {
    // For now, we'll use a simple geocoding + Haversine formula approach
    // This doesn't require an API key for basic distance calculations
    this.apiKey = apiKey || process.env.OPENROUTESERVICE_API_KEY || '';
  }

  /**
   * Calculate distance between two locations
   * Uses Haversine formula for great-circle distance
   */
  async calculateDistance(
    origin: string,
    destination: string
  ): Promise<DistanceResult | null> {
    try {
      // Geocode both locations
      const [originCoords, destCoords] = await Promise.all([
        this.geocodeLocation(origin),
        this.geocodeLocation(destination),
      ]);

      if (!originCoords || !destCoords) {
        return null;
      }

      // Calculate distance using Haversine formula
      const distance = this.haversineDistance(
        originCoords.lat,
        originCoords.lon,
        destCoords.lat,
        destCoords.lon
      );

      // Estimate duration (assuming average speed of 60 km/h)
      const duration = (distance / 60) * 60; // in minutes

      return {
        distance_km: Math.round(distance * 10) / 10,
        duration_minutes: Math.round(duration),
        origin: { ...originCoords, name: origin },
        destination: { ...destCoords, name: destination },
      };
    } catch (error) {
      console.error('Distance calculation error:', error);
      return null;
    }
  }

  /**
   * Geocode a location name to coordinates
   * Uses OpenStreetMap Nominatim (free, no API key required)
   */
  private async geocodeLocation(locationName: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: locationName,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'TripWhat Travel Planner',
        },
      });

      if (response.data && response.data.length > 0) {
        return {
          lat: parseFloat(response.data[0].lat),
          lon: parseFloat(response.data[0].lon),
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Haversine formula for great-circle distance
   * Returns distance in kilometers
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get simple routing directions
   * For now, returns basic info. Can be enhanced with actual routing API
   */
  async getDirections(
    origin: string,
    destination: string,
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<DirectionsResult | null> {
    try {
      const distanceInfo = await this.calculateDistance(origin, destination);
      
      if (!distanceInfo) {
        return null;
      }

      // Adjust duration based on mode
      let duration = distanceInfo.duration_minutes;
      if (mode === 'walking') {
        duration = (distanceInfo.distance_km / 5) * 60; // 5 km/h walking speed
      } else if (mode === 'cycling') {
        duration = (distanceInfo.distance_km / 15) * 60; // 15 km/h cycling speed
      }

      return {
        distance_km: distanceInfo.distance_km,
        duration_minutes: Math.round(duration),
        steps: [
          {
            instruction: `Head from ${origin} to ${destination}`,
            distance_km: distanceInfo.distance_km,
            duration_minutes: Math.round(duration),
          },
        ],
        geometry: {
          type: 'LineString',
          coordinates: [
            [distanceInfo.origin.lon, distanceInfo.origin.lat],
            [distanceInfo.destination.lon, distanceInfo.destination.lat],
          ],
        },
      };
    } catch (error) {
      console.error('Directions error:', error);
      return null;
    }
  }

  /**
   * Estimate travel time between multiple waypoints
   */
  async estimateMultiStopRoute(waypoints: string[]): Promise<{
    total_distance_km: number;
    total_duration_minutes: number;
    legs: Array<{ from: string; to: string; distance_km: number; duration_minutes: number }>;
  } | null> {
    try {
      const legs: Array<{ from: string; to: string; distance_km: number; duration_minutes: number }> = [];
      let totalDistance = 0;
      let totalDuration = 0;

      for (let i = 0; i < waypoints.length - 1; i++) {
        const leg = await this.calculateDistance(waypoints[i], waypoints[i + 1]);
        if (leg) {
          legs.push({
            from: waypoints[i],
            to: waypoints[i + 1],
            distance_km: leg.distance_km,
            duration_minutes: leg.duration_minutes,
          });
          totalDistance += leg.distance_km;
          totalDuration += leg.duration_minutes;
        }
      }

      return {
        total_distance_km: Math.round(totalDistance * 10) / 10,
        total_duration_minutes: Math.round(totalDuration),
        legs,
      };
    } catch (error) {
      console.error('Multi-stop route error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const transportAPI = new TransportAPI();
