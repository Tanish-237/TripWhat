/**
 * Itinerary Builder Service
 * Constructs structured multi-day itineraries from OpenTripMap data
 */

import { v4 as uuidv4 } from 'uuid';
import type { Itinerary, DayPlan, TimeSlot, Activity, TripMetadata } from '../types/itinerary.js';
import type { Destination } from '../mcp-servers/places/types.js';
import { getOpenTripMapAPI } from '../mcp-servers/places/api.js';

export class ItineraryBuilder {
  private openTripMapAPI = getOpenTripMapAPI();

  /**
   * Build a complete itinerary for a destination
   */
  async buildItinerary(
    destination: string,
    duration: number,
    preferences?: string[]
  ): Promise<Itinerary | null> {
    try {
      console.log(`🗓️ [ITINERARY] Building ${duration}-day itinerary for ${destination}`);

      // 1. Get coordinates for destination
      const coords = await this.getDestinationCoords(destination);
      if (!coords) {
        console.error('Failed to geocode destination');
        return null;
      }

      console.log(`📍 [ITINERARY] Coordinates: ${coords.lat}, ${coords.lon}`);

      // 2. Fetch diverse places
      const places = await this.openTripMapAPI.getItineraryPlaces(
        coords.lat,
        coords.lon,
        10000 // 10km radius
      );

      console.log(`✅ [ITINERARY] Found ${places.attractions.length} attractions, ${places.restaurants.length} restaurants`);

      // 3. Build daily plans
      const days: DayPlan[] = [];
      for (let dayNum = 1; dayNum <= duration; dayNum++) {
        const dayPlan = this.buildDayPlan(dayNum, places, preferences);
        days.push(dayPlan);
      }

      // 4. Construct itinerary
      const itinerary: Itinerary = {
        id: uuidv4(),
        tripMetadata: {
          destination,
          duration,
          preferences,
        },
        days,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(`🎉 [ITINERARY] Successfully built ${duration}-day itinerary with ${days.length} days`);
      return itinerary;
    } catch (error) {
      console.error('Itinerary builder error:', error);
      return null;
    }
  }

  /**
   * Get coordinates for a destination name
   */
  private async getDestinationCoords(destination: string): Promise<{ lat: number; lon: number } | null> {
    const places = await this.openTripMapAPI.searchPlaces(destination, 1);
    if (places.length > 0) {
      return {
        lat: places[0].location.latitude,
        lon: places[0].location.longitude,
      };
    }
    return null;
  }

  /**
   * Build a single day plan with morning/afternoon/evening activities
   */
  private buildDayPlan(
    dayNumber: number,
    places: {
      attractions: Destination[];
      restaurants: Destination[];
      nature: Destination[];
      culture: Destination[];
    },
    preferences?: string[]
  ): DayPlan {
    // Distribute activities across the day
    const allPlaces = [
      ...places.attractions,
      ...places.culture,
      ...places.nature,
    ].filter(p => p.name); // Filter out places without names

    // Simple algorithm: pick different places for each time slot
    const startIdx = (dayNumber - 1) * 3;
    const morningPlaces = allPlaces.slice(startIdx, startIdx + 2);
    const afternoonPlaces = allPlaces.slice(startIdx + 2, startIdx + 4);
    const eveningPlaces = [...places.restaurants.slice((dayNumber - 1) * 2, dayNumber * 2)];

    return {
      dayNumber,
      title: `Day ${dayNumber}`,
      timeSlots: [
        this.buildTimeSlot('morning', '09:00', '12:00', morningPlaces),
        this.buildTimeSlot('afternoon', '14:00', '18:00', afternoonPlaces),
        this.buildTimeSlot('evening', '19:00', '22:00', eveningPlaces),
      ],
    };
  }

  /**
   * Build a time slot with activities
   */
  private buildTimeSlot(
    period: 'morning' | 'afternoon' | 'evening' | 'night',
    startTime: string,
    endTime: string,
    places: Destination[]
  ): TimeSlot {
    const activities: Activity[] = places.map(place => this.destinationToActivity(place));

    return {
      period,
      startTime,
      endTime,
      activities,
    };
  }

  /**
   * Convert Destination to Activity
   */
  private destinationToActivity(destination: Destination): Activity {
    // Estimate duration based on category
    const duration = this.estimateDuration(destination.category);
    const cost = this.estimateCost(destination.category);

    return {
      id: uuidv4(),
      name: destination.name,
      location: {
        lat: destination.location.latitude,
        lon: destination.location.longitude,
      },
      duration,
      estimatedCost: cost,
      category: destination.category[0] || 'attraction',
      description: destination.description,
      rating: destination.rating,
      imageUrl: destination.image,
      kinds: destination.category,
      xid: destination.id,
    };
  }

  /**
   * Estimate visit duration based on category
   */
  private estimateDuration(categories: string[]): string {
    const categoryStr = categories.join(',').toLowerCase();
    
    if (categoryStr.includes('museum') || categoryStr.includes('galleries')) {
      return '2-3h';
    }
    if (categoryStr.includes('restaurant') || categoryStr.includes('food')) {
      return '1-1.5h';
    }
    if (categoryStr.includes('park') || categoryStr.includes('natural')) {
      return '1-2h';
    }
    if (categoryStr.includes('monument') || categoryStr.includes('architecture')) {
      return '30min-1h';
    }
    
    return '1-2h'; // default
  }

  /**
   * Estimate cost based on category
   */
  private estimateCost(categories: string[]): string {
    const categoryStr = categories.join(',').toLowerCase();
    
    if (categoryStr.includes('museum')) {
      return '$15-25';
    }
    if (categoryStr.includes('restaurant')) {
      return '$20-40';
    }
    if (categoryStr.includes('park') || categoryStr.includes('natural')) {
      return 'Free';
    }
    if (categoryStr.includes('monument')) {
      return '$10-20';
    }
    
    return '$10-30'; // default
  }
}

// Singleton instance
export const itineraryBuilder = new ItineraryBuilder();
