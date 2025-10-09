import { z } from 'zod';
import { transportAPI } from './api.js';

/**
 * Tool: Calculate Distance
 * Calculate distance and travel time between two locations
 */
export const calculateDistanceTool = {
  name: 'calculate_distance',
  description: 'Calculate the distance and estimated travel time between two locations. Useful for trip planning and understanding travel logistics.',
  inputSchema: z.object({
    origin: z.string().describe('Starting location (city, landmark, or address)'),
    destination: z.string().describe('Destination location (city, landmark, or address)'),
  }),
  execute: async (args: { origin: string; destination: string }) => {
    try {
      const result = await transportAPI.calculateDistance(args.origin, args.destination);
      
      if (!result) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Could not calculate distance. Please check location names.' }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              distance: {
                kilometers: result.distance_km,
                miles: Math.round(result.distance_km * 0.621371 * 10) / 10,
              },
              estimated_travel_time: {
                by_car_minutes: result.duration_minutes,
                by_car_hours: Math.round(result.duration_minutes / 60 * 10) / 10,
              },
              origin: args.origin,
              destination: args.destination,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Distance calculation failed', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool: Get Directions
 * Get routing directions between two locations
 */
export const getDirectionsTool = {
  name: 'get_directions',
  description: 'Get routing directions and travel time between two locations. Supports different travel modes (driving, walking, cycling).',
  inputSchema: z.object({
    origin: z.string().describe('Starting location'),
    destination: z.string().describe('Destination location'),
    mode: z.enum(['driving', 'walking', 'cycling']).optional().default('driving').describe('Travel mode'),
  }),
  execute: async (args: { origin: string; destination: string; mode?: 'driving' | 'walking' | 'cycling' }) => {
    try {
      const result = await transportAPI.getDirections(args.origin, args.destination, args.mode || 'driving');
      
      if (!result) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Could not get directions' }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mode: args.mode || 'driving',
              distance_km: result.distance_km,
              duration_minutes: result.duration_minutes,
              duration_formatted: `${Math.floor(result.duration_minutes / 60)}h ${result.duration_minutes % 60}m`,
              summary: `${result.distance_km} km, approximately ${Math.round(result.duration_minutes / 60 * 10) / 10} hours by ${args.mode || 'car'}`,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Directions failed', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool: Estimate Multi-Stop Route
 * Calculate total distance and time for a route with multiple stops
 */
export const estimateMultiStopRouteTool = {
  name: 'estimate_route',
  description: 'Calculate the total distance and time for a multi-stop route. Perfect for planning day trips or multi-city tours.',
  inputSchema: z.object({
    waypoints: z.array(z.string()).describe('List of locations in order (e.g., ["Paris", "Lyon", "Marseille"])'),
  }),
  execute: async (args: { waypoints: string[] }) => {
    try {
      if (args.waypoints.length < 2) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'At least 2 waypoints are required' }),
            },
          ],
          isError: true,
        };
      }

      const result = await transportAPI.estimateMultiStopRoute(args.waypoints);
      
      if (!result) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Could not estimate route' }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              total_distance_km: result.total_distance_km,
              total_duration_minutes: result.total_duration_minutes,
              total_duration_formatted: `${Math.floor(result.total_duration_minutes / 60)}h ${result.total_duration_minutes % 60}m`,
              number_of_stops: args.waypoints.length,
              legs: result.legs,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Route estimation failed', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

// Export all transport tools
export const transportTools = [
  calculateDistanceTool,
  getDirectionsTool,
  estimateMultiStopRouteTool,
];
