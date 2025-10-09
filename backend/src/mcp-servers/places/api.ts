import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type {OpenTripMapPlace, PlaceDetails, Destination, GeoJSONFeatureCollection } from './types.js';

// Ensure environment variables are loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// OpenTripMap API - Get free key at https://opentripmap.io/product
const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';

export class OpenTripMapAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    // Use provided key, environment variable, or warn
    this.apiKey = apiKey || process.env.OPENTRIPMAP_API_KEY || '';
    
    console.log('[OpenTripMapAPI] Constructor called');
    console.log('[OpenTripMapAPI] Provided key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
    console.log('[OpenTripMapAPI] Env key:', process.env.OPENTRIPMAP_API_KEY ? `${process.env.OPENTRIPMAP_API_KEY.substring(0, 10)}...` : 'undefined');
    console.log('[OpenTripMapAPI] Final key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'EMPTY!');
    
    if (!this.apiKey) {
      console.warn('⚠️  OpenTripMap API key not found. Get your free key at https://opentripmap.io/product');
      console.warn('   Add it to .env as OPENTRIPMAP_API_KEY=your_key_here');
    }
  }

  /**
   * Search for places by name/query
   * Includes rate limiting protection and retry mechanism
   */
  async searchPlaces(query: string, limit: number = 10, retries = 3): Promise<Destination[]> {
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

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

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
    } catch (error: any) {
      console.error(`OpenTripMap search error for "${query}":`, error.message || 'Unknown error');
      
      // Retry on rate limit errors (429) or network errors
      if ((error.response?.status === 429 || !error.response) && retries > 0) {
        console.log(`Rate limit hit or network error, retrying in ${(4 - retries) * 500}ms (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 500)); // Exponential backoff
        return this.searchPlaces(query, limit, retries - 1);
      }
      
      return [];
    }
  }

  /**
   * Search places by category (museums, restaurants, nature, etc.)
   * Useful for building diverse itineraries
   * Includes retry mechanism for rate limiting issues
   */
  async searchByCategory(
    lat: number,
    lon: number,
    category: string,
    radius: number = 5000,
    limit: number = 10,
    retries = 3
  ): Promise<Destination[]> {
    try {
      const response = await axios.get(`${BASE_URL}/radius`, {
        params: {
          radius,
          lon,
          lat,
          kinds: category, // e.g., 'museums', 'restaurants', 'natural'
          limit,
          format: 'geojson',
          apikey: this.apiKey,
        },
      });

      const geoData = response.data as GeoJSONFeatureCollection;
      if (!geoData.features || !Array.isArray(geoData.features)) {
        return [];
      }

      return this.transformGeoJSONFeatures(geoData.features);
    } catch (error: any) {
      console.error(`OpenTripMap category search error (${category}):`, error.message || 'Unknown error');
      
      // Retry on rate limit errors (429) or network errors
      if ((error.response?.status === 429 || !error.response) && retries > 0) {
        console.log(`Rate limit hit or network error, retrying in ${(4 - retries) * 500}ms (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 500)); // Exponential backoff
        return this.searchByCategory(lat, lon, category, radius, limit, retries - 1);
      }
      
      return [];
    }
  }

  /**
   * Get multiple categories of places for itinerary building
   * Returns a diverse set of attractions, restaurants, and activities
   * Uses sequential requests to avoid rate limiting issues
   */
  async getItineraryPlaces(
    lat: number,
    lon: number,
    radius: number = 5000
  ): Promise<{
    attractions: Destination[];
    restaurants: Destination[];
    nature: Destination[];
    culture: Destination[];
  }> {
    try {
      // Sequential requests with delay to avoid 429 rate limiting errors
      const attractions = await this.searchByCategory(lat, lon, 'interesting_places', radius, 10);
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between requests
      
      const restaurants = await this.searchByCategory(lat, lon, 'foods', radius, 5);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const nature = await this.searchByCategory(lat, lon, 'natural', radius, 5);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const culture = await this.searchByCategory(lat, lon, 'cultural,museums,theatres_and_entertainments', radius, 8);

      return { attractions, restaurants, nature, culture };
    } catch (error) {
      console.error('OpenTripMap itinerary places error:', error);
      return { attractions: [], restaurants: [], nature: [], culture: [] };
    }
  }

  /**
   * Get detailed information about a specific place
   * Includes retry logic for rate limiting issues
   */
  async getPlaceDetails(xid: string, retries = 3): Promise<PlaceDetails | null> {
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
    } catch (error: any) {
      console.error(`OpenTripMap details error for ${xid}:`, error.message || 'Unknown error');
      
      // Retry on rate limit errors (429) or network errors
      if ((error.response?.status === 429 || !error.response) && retries > 0) {
        console.log(`Rate limit hit or network error, retrying in ${(4 - retries) * 500}ms (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 500)); // Exponential backoff
        return this.getPlaceDetails(xid, retries - 1);
      }
      
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

// Lazy singleton instance - only created when first accessed
let _openTripMapAPIInstance: OpenTripMapAPI | null = null;

export function getOpenTripMapAPI(): OpenTripMapAPI {
  if (!_openTripMapAPIInstance) {
    // Explicitly pass API key from environment
    const apiKey = process.env.OPENTRIPMAP_API_KEY || '';
    _openTripMapAPIInstance = new OpenTripMapAPI(apiKey);
  }
  return _openTripMapAPIInstance;
}

// For backward compatibility
export const openTripMapAPI = new Proxy({} as OpenTripMapAPI, {
  get(target, prop) {
    return getOpenTripMapAPI()[prop as keyof OpenTripMapAPI];
  },
});
