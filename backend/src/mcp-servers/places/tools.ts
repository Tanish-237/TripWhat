import { z } from 'zod';
import { openTripMapAPI } from './api.js';

/**
 * Tool 1: Search Destinations
 * Find places by name or query
 */
export const searchDestinationsTool = {
  name: 'search_destinations',
  description: 'Search for travel destinations, cities, or tourist attractions by name. Returns a list of places with their coordinates and categories.',
  inputSchema: z.object({
    query: z.string().describe('The destination name or search query (e.g., "Paris", "beaches in Thailand", "Eiffel Tower")'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return (default: 10)'),
  }),
  execute: async (args: { query: string; limit?: number }) => {
    try {
      const results = await openTripMapAPI.searchPlaces(args.query, args.limit || 10);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              count: results.length,
              destinations: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Failed to search destinations', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool 2: Get Place Details
 * Get detailed information about a specific place
 */
export const getPlaceDetailsTool = {
  name: 'get_place_details',
  description: 'Get detailed information about a specific place including description, rating, images, and Wikipedia extracts.',
  inputSchema: z.object({
    placeId: z.string().describe('The unique identifier (xid) of the place from search results'),
  }),
  execute: async (args: { placeId: string }) => {
    try {
      const details = await openTripMapAPI.getEnrichedPlaceDetails(args.placeId);
      
      if (!details) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Place not found' }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(details, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Failed to get place details', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool 3: Get Nearby Attractions
 * Find tourist attractions near specific coordinates
 */
export const getNearbyAttractionsTool = {
  name: 'get_nearby_attractions',
  description: 'Find tourist attractions, museums, monuments, and points of interest near specific GPS coordinates.',
  inputSchema: z.object({
    latitude: z.number().describe('Latitude coordinate'),
    longitude: z.number().describe('Longitude coordinate'),
    radius: z.number().optional().default(3000).describe('Search radius in meters (default: 3000m = 3km)'),
    limit: z.number().optional().default(20).describe('Maximum number of results (default: 20)'),
    kinds: z.string().optional().describe('Comma-separated categories (e.g., "museums,parks,monuments"). Leave empty for all tourist attractions.'),
  }),
  execute: async (args: { latitude: number; longitude: number; radius?: number; limit?: number; kinds?: string }) => {
    try {
      const results = await openTripMapAPI.getNearbyAttractions(
        args.latitude,
        args.longitude,
        args.radius || 3000,
        args.limit || 20,
        args.kinds
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              location: {
                latitude: args.latitude,
                longitude: args.longitude,
              },
              radius: args.radius || 3000,
              count: results.length,
              attractions: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Failed to get nearby attractions', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool 4: Search Restaurants
 * Find restaurants and dining options
 */
export const searchRestaurantsTool = {
  name: 'search_restaurants',
  description: 'Find restaurants, cafes, and dining options in a specific location. Can filter by cuisine type.',
  inputSchema: z.object({
    location: z.string().describe('City or area to search for restaurants'),
    cuisine: z.string().optional().describe('Cuisine type (e.g., "italian", "asian", "french")'),
    limit: z.number().optional().default(10).describe('Maximum number of results'),
  }),
  execute: async (args: { location: string; cuisine?: string; limit?: number }) => {
    try {
      // First geocode the location
      const tempResults = await openTripMapAPI.searchPlaces(args.location, 1);
      if (tempResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Location not found' }),
            },
          ],
          isError: true,
        };
      }

      const { latitude, longitude } = tempResults[0].location;
      
      // Search for restaurants
      const restaurants = await openTripMapAPI.searchByCategory(
        latitude,
        longitude,
        'foods',
        5000, // 5km radius
        args.limit || 10
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              location: args.location,
              cuisine: args.cuisine,
              count: restaurants.length,
              restaurants: restaurants.map(r => ({
                name: r.name,
                category: r.category,
                rating: r.rating,
                location: r.location,
              })),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Restaurant search failed', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool 5: Search by Category
 * Search for places by specific category
 */
export const searchByCategoryTool = {
  name: 'search_by_category',
  description: 'Search for specific types of places like museums, parks, monuments, historical sites, etc.',
  inputSchema: z.object({
    location: z.string().describe('City or area to search in'),
    category: z.enum([
      'museums',
      'monuments',
      'parks',
      'churches',
      'theatres',
      'historic',
      'architecture',
      'natural',
      'beaches',
      'cultural',
      'sport',
      'amusements',
    ]).describe('Category of places to search for'),
    limit: z.number().optional().default(10).describe('Maximum number of results'),
  }),
  execute: async (args: { location: string; category: string; limit?: number }) => {
    try {
      // Geocode location
      const tempResults = await openTripMapAPI.searchPlaces(args.location, 1);
      if (tempResults.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Location not found' }),
            },
          ],
          isError: true,
        };
      }

      const { latitude, longitude } = tempResults[0].location;
      
      // Search by category
      const results = await openTripMapAPI.searchByCategory(
        latitude,
        longitude,
        args.category,
        10000, // 10km radius
        args.limit || 10
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              location: args.location,
              category: args.category,
              count: results.length,
              places: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Category search failed', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

// Export all tools
export const placesTools = [
  searchDestinationsTool,
  getPlaceDetailsTool,
  getNearbyAttractionsTool,
  searchRestaurantsTool,
  searchByCategoryTool,
];
