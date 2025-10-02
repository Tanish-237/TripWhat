import axios from 'axios';
import type {OpenTripMapPlace, PlaceDetails, Destination, GeoJSONFeatureCollection } from './types.js';

// OpenTripMap API - Get free key at https://opentripmap.io/product
const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';

export class OpenTripMapAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    // Use provided key, environment variable, or warn
    this.apiKey = apiKey || process.env.OPENTRIPMAP_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️  OpenTripMap API key not found. Get your free key at https://opentripmap.io/product');
      console.warn('   Add it to .env as OPENTRIPMAP_API_KEY=your_key_here');
    }
  }

  /**
   * Search for places by name/query
   */
  async searchPlaces(query: string, limit: number = 10): Promise<Destination[]> {
    try {
      // First, geocode the query to get coordinates
      const geoResponse = await axios.get(`${BASE_URL}/geoname`, {
        params: {
          name: query,
          apikey: this.apiKey,
        },
      });

      if (!geoResponse.data || !geoResponse.data.lat) {
        return [];
      }

      const { lat, lon } = geoResponse.data;

      // Get places around those coordinates with GeoJSON format
      const placesResponse = await axios.get(`${BASE_URL}/radius`, {
        params: {
          radius: 5000, // 5km radius
          lon,
          lat,
          limit,
          format: 'geojson',
          apikey: this.apiKey,
        },
      });

      const geoData = placesResponse.data as GeoJSONFeatureCollection;

      if (!geoData.features || !Array.isArray(geoData.features)) {
        console.error('Unexpected response format:', geoData);
        return [];
      }

      return this.transformGeoJSONFeatures(geoData.features);
    } catch (error) {
      console.error('OpenTripMap search error:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(xid: string): Promise<PlaceDetails | null> {
    try {
      const response = await axios.get(`${BASE_URL}/xid/${xid}`, {
        params: {
          apikey: this.apiKey,
        },
      });

      const details = response.data as PlaceDetails;

      if (!details) {
        console.error('Unexpected response format:', details);
        return null;
      }

      return details;
    } catch (error) {
      console.error('OpenTripMap details error:', error);
      return null;
    }
  }

  /**
   * Get nearby attractions given coordinates
   */
  async getNearbyAttractions(
    lat: number,
    lon: number,
    radius: number = 3000,
    limit: number = 20,
    kinds?: string
  ): Promise<Destination[]> {
    try {
      const response = await axios.get(`${BASE_URL}/radius`, {
        params: {
          radius,
          lon,
          lat,
          limit,
          format: 'geojson',
          apikey: this.apiKey,
        },
      });

      const geoData = response.data as GeoJSONFeatureCollection;

      if (!geoData.features || !Array.isArray(geoData.features)) {
        console.error('Unexpected response format:', geoData);
        return [];
      }

      return this.transformGeoJSONFeatures(geoData.features);
    } catch (error) {
      console.error('OpenTripMap nearby error:', error);
      return [];
    }
  }

  /**
   * Transform GeoJSON features to our destination format
   */
  private transformGeoJSONFeatures(features: GeoJSONFeatureCollection['features']): Destination[] {
    return features
      .filter((feature) => feature.properties.name && feature.properties.name.trim() !== '')
      .map((feature) => ({
        id: feature.properties.xid,
        name: feature.properties.name,
        location: {
          latitude: feature.geometry.coordinates[1], // GeoJSON is [lon, lat]
          longitude: feature.geometry.coordinates[0],
        },
        category: feature.properties.kinds ? feature.properties.kinds.split(',') : [],
        distance: feature.properties.dist,
        rating: feature.properties.rate,
      }));
  }

  /**
   * Get enriched place details with description and image
   */
  async getEnrichedPlaceDetails(xid: string): Promise<Destination | null> {
    const details = await this.getPlaceDetails(xid);
    
    if (!details) {
      return null;
    }

    return {
      id: details.xid,
      name: details.name,
      description: details.wikipedia_extracts?.text || details.kinds,
      location: {
        latitude: details.point.lat,
        longitude: details.point.lon,
      },
      category: details.kinds ? details.kinds.split(',') : [],
      rating: details.rate,
      image: details.preview?.source || details.image,
    };
  }
}

// Singleton instance
export const openTripMapAPI = new OpenTripMapAPI();
