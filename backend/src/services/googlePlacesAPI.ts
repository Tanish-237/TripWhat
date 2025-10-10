import axios from 'axios';

/**
 * Google Places API Service (New)
 * Uses Places API (New) for detailed place information, photos, pricing, hours
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE = 'https://places.googleapis.com/v1';

export interface PlaceDetails {
  id: string;
  name: string;
  displayName: string;
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  userRatingCount: number;
  priceLevel?: string;
  openingHours?: {
    weekdayDescriptions: string[];
    openNow: boolean;
    periods: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
  };
  photos: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions: any[];
  }>;
  editorialSummary?: {
    text: string;
    languageCode: string;
  };
  types: string[];
  websiteUri?: string;
  internationalPhoneNumber?: string;
  businessStatus?: string;
}

export interface PlacePhoto {
  url: string;
  attribution: string;
}

export class GooglePlacesAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  Google Places API key not set. Place details will be limited.');
    }
  }

  /**
   * Search for places by text query
   */
  async searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<PlaceDetails[]> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const response = await axios.post(
        `${PLACES_API_BASE}/places:searchText`,
        {
          textQuery: query,
          ...(location && {
            locationBias: {
              circle: {
                center: { latitude: location.lat, longitude: location.lng },
                radius: 50000 // 50km
              }
            }
          })
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.photos,places.editorialSummary,places.types,places.websiteUri,places.internationalPhoneNumber,places.businessStatus'
          }
        }
      );

      return (response.data.places || []).map(this.formatPlace.bind(this));
    } catch (error: any) {
      console.error('❌ Google Places search error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const response = await axios.get(
        `${PLACES_API_BASE}/places/${placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,regularOpeningHours,photos,editorialSummary,types,websiteUri,internationalPhoneNumber,businessStatus'
          }
        }
      );

      return this.formatPlace(response.data);
    } catch (error: any) {
      console.error('❌ Place details error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get photo URL for a place photo
   */
  getPhotoUrl(photoName: string, maxWidth: number = 800, maxHeight: number = 600): string {
    if (!this.apiKey) return '';
    
    // Photo name format: places/PLACE_ID/photos/PHOTO_RESOURCE
    return `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${this.apiKey}`;
  }

  /**
   * Calculate distance between two places using Distance Matrix API
   */
  async calculateDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<{ distance: string; duration: string } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        {
          params: {
            origins: `${origin.lat},${origin.lng}`,
            destinations: `${destination.lat},${destination.lng}`,
            key: this.apiKey,
            mode: 'walking'
          }
        }
      );

      const element = response.data.rows?.[0]?.elements?.[0];
      
      if (element?.status === 'OK') {
        return {
          distance: element.distance.text,
          duration: element.duration.text
        };
      }

      return null;
    } catch (error: any) {
      console.error('❌ Distance calculation error:', error.message);
      return null;
    }
  }

  /**
   * Format place data to our standard interface
   */
  private formatPlace(place: any): PlaceDetails {
    return {
      id: place.id || place.name?.split('/')[1] || '',
      name: place.displayName?.text || place.displayName || '',
      displayName: place.displayName?.text || place.displayName || '',
      formattedAddress: place.formattedAddress || '',
      location: {
        latitude: place.location?.latitude || 0,
        longitude: place.location?.longitude || 0
      },
      rating: place.rating || 0,
      userRatingCount: place.userRatingCount || 0,
      priceLevel: this.formatPriceLevel(place.priceLevel),
      openingHours: place.regularOpeningHours ? {
        weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions || [],
        openNow: place.regularOpeningHours.openNow || false,
        periods: place.regularOpeningHours.periods || []
      } : undefined,
      photos: (place.photos || []).map((photo: any) => ({
        name: photo.name,
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
        authorAttributions: photo.authorAttributions || []
      })),
      editorialSummary: place.editorialSummary,
      types: place.types || [],
      websiteUri: place.websiteUri,
      internationalPhoneNumber: place.internationalPhoneNumber,
      businessStatus: place.businessStatus
    };
  }

  /**
   * Convert price level enum to readable string
   */
  private formatPriceLevel(priceLevel?: string): string | undefined {
    if (!priceLevel) return undefined;
    
    const priceLevels: Record<string, string> = {
      'PRICE_LEVEL_FREE': 'Free',
      'PRICE_LEVEL_INEXPENSIVE': '$',
      'PRICE_LEVEL_MODERATE': '$$',
      'PRICE_LEVEL_EXPENSIVE': '$$$',
      'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
    };
    
    return priceLevels[priceLevel] || priceLevel;
  }

  /**
   * Extract ticket price estimate from opening hours or description
   */
  estimateTicketPrice(place: PlaceDetails): string {
    // If we have price level, use it
    if (place.priceLevel) {
      const estimates: Record<string, string> = {
        'Free': 'Free',
        '$': '$5-10',
        '$$': '$10-25',
        '$$$': '$25-50',
        '$$$$': '$50+'
      };
      return estimates[place.priceLevel] || '$10-30';
    }

    // Check if it's a typical free attraction
    const freeTypes = ['park', 'church', 'mosque', 'temple', 'cemetery', 'viewpoint'];
    const isFree = place.types.some(type => 
      freeTypes.some(free => type.toLowerCase().includes(free))
    );

    if (isFree) return 'Free';

    // Default estimates by type
    if (place.types.includes('museum')) return '$15-25';
    if (place.types.includes('amusement_park')) return '$30-60';
    if (place.types.includes('zoo')) return '$20-35';
    if (place.types.includes('aquarium')) return '$25-40';
    
    return '$10-30'; // Default
  }
}

// Export singleton
export const googlePlacesAPI = new GooglePlacesAPI();
