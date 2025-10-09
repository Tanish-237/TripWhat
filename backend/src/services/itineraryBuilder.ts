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
   * Build itinerary with trip context (budget, preferences, travel type)
   */
  async buildItineraryWithContext(
    destination: string,
    duration: number,
    context: {
      dailyBudget: number;
      preferredCategories: string[];
      activityLevel: 'low' | 'medium' | 'high';
      pacing: 'relaxed' | 'moderate' | 'fast';
      numberOfPeople: number;
    }
  ): Promise<Itinerary | null> {
    try {
      console.log(`🎯 [CONTEXT ITINERARY] Building ${duration}-day itinerary for ${destination} with context`);
      console.log(`   Budget: $${context.dailyBudget}/day, Activity Level: ${context.activityLevel}, Pacing: ${context.pacing}`);

      // 1. Get coordinates
      const coords = await this.getDestinationCoords(destination);
      if (!coords) {
        console.error('Failed to geocode destination');
        return null;
      }

      // 2. Fetch places filtered by preferred categories
      const places = await this.fetchCategoryFilteredPlaces(
        coords.lat,
        coords.lon,
        context.preferredCategories
      );

      console.log(`✅ [CONTEXT ITINERARY] Found ${places.total} places matching preferences`);

      // 3. Determine activities per day based on pacing and activity level
      const activitiesPerDay = this.calculateActivitiesPerDay(context.pacing, context.activityLevel);

      // 4. Build daily plans with budget awareness
      const days: DayPlan[] = [];
      for (let dayNum = 1; dayNum <= duration; dayNum++) {
        const dayPlan = this.buildBudgetAwareDayPlan(
          dayNum,
          places,
          context.dailyBudget,
          activitiesPerDay,
          context.numberOfPeople
        );
        days.push(dayPlan);
      }

      // 5. Construct itinerary
      const itinerary: Itinerary = {
        id: uuidv4(),
        tripMetadata: {
          destination,
          duration,
          preferences: context.preferredCategories,
        },
        days,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(`🎉 [CONTEXT ITINERARY] Successfully built itinerary`);
      return itinerary;
    } catch (error) {
      console.error('Context itinerary builder error:', error);
      return null;
    }
  }

  /**
   * Fetch places filtered by category preferences
   */
  private async fetchCategoryFilteredPlaces(
    lat: number,
    lon: number,
    preferredCategories: string[]
  ): Promise<{
    all: Destination[];
    byCategory: Map<string, Destination[]>;
    total: number;
  }> {
    // Fetch itinerary places (already diverse)
    const basePlaces = await this.openTripMapAPI.getItineraryPlaces(lat, lon, 10000);
    
    // Combine all places
    const allPlaces = [
      ...basePlaces.attractions,
      ...basePlaces.restaurants,
      ...basePlaces.nature,
      ...basePlaces.culture,
    ].filter(p => p.name);

    // Filter by preferred categories
    const filtered = allPlaces.filter(place => {
      const placeCategories = place.category.map(c => c.toLowerCase());
      return preferredCategories.some(pref => 
        placeCategories.some(cat => cat.includes(pref.toLowerCase()))
      );
    });

    // Group by category
    const byCategory = new Map<string, Destination[]>();
    filtered.forEach(place => {
      place.category.forEach(cat => {
        if (!byCategory.has(cat)) {
          byCategory.set(cat, []);
        }
        byCategory.get(cat)!.push(place);
      });
    });

    return {
      all: filtered.length > 0 ? filtered : allPlaces, // Fallback to all if no matches
      byCategory,
      total: filtered.length
    };
  }

  /**
   * Calculate activities per day based on pacing and activity level
   */
  private calculateActivitiesPerDay(
    pacing: 'relaxed' | 'moderate' | 'fast',
    activityLevel: 'low' | 'medium' | 'high'
  ): { morning: number; afternoon: number; evening: number } {
    const pacingMap = {
      relaxed: { morning: 1, afternoon: 1, evening: 1 },
      moderate: { morning: 2, afternoon: 2, evening: 1 },
      fast: { morning: 2, afternoon: 3, evening: 2 },
    };

    const activityMap = {
      low: 0.8,
      medium: 1.0,
      high: 1.2,
    };

    const base = pacingMap[pacing];
    const multiplier = activityMap[activityLevel];

    return {
      morning: Math.max(1, Math.round(base.morning * multiplier)),
      afternoon: Math.max(1, Math.round(base.afternoon * multiplier)),
      evening: Math.max(1, Math.round(base.evening * multiplier)),
    };
  }

  /**
   * Build a day plan with budget awareness
   */
  private buildBudgetAwareDayPlan(
    dayNumber: number,
    places: { all: Destination[]; byCategory: Map<string, Destination[]>; total: number },
    dailyBudget: number,
    activitiesPerDay: { morning: number; afternoon: number; evening: number },
    numberOfPeople: number
  ): DayPlan {
    const usedIndices = new Set<number>();
    let budgetRemaining = dailyBudget * numberOfPeople;

    // Helper to select places
    const selectPlaces = (count: number, preferRestaurants: boolean = false): Destination[] => {
      const selected: Destination[] = [];
      const availablePlaces = preferRestaurants
        ? places.all.filter(p => p.category.some(c => c.toLowerCase().includes('restaurant')))
        : places.all;

      for (let i = 0; i < availablePlaces.length && selected.length < count; i++) {
        const place = availablePlaces[i];
        const idx = places.all.indexOf(place);
        
        if (!usedIndices.has(idx)) {
          // Check if we can afford this activity
          const estimatedCost = this.parseCost(this.estimateCost(place.category)) * numberOfPeople;
          
          if (budgetRemaining >= estimatedCost || estimatedCost === 0) {
            selected.push(place);
            usedIndices.add(idx);
            budgetRemaining -= estimatedCost;
          }
        }
      }

      return selected;
    };

    return {
      dayNumber,
      title: `Day ${dayNumber}`,
      timeSlots: [
        this.buildTimeSlot('morning', '09:00', '12:00', selectPlaces(activitiesPerDay.morning)),
        this.buildTimeSlot('afternoon', '14:00', '18:00', selectPlaces(activitiesPerDay.afternoon)),
        this.buildTimeSlot('evening', '19:00', '22:00', selectPlaces(activitiesPerDay.evening, true)),
      ],
    };
  }

  /**
   * Parse cost string to average number
   */
  private parseCost(costString: string): number {
    if (costString.toLowerCase().includes('free')) return 0;
    
    const numbers = costString.match(/\d+/g);
    if (!numbers || numbers.length === 0) return 20; // default
    
    if (numbers.length === 1) return parseInt(numbers[0]);
    
    // Average of range
    const sum = numbers.reduce((a, b) => a + parseInt(b), 0);
    return Math.round(sum / numbers.length);
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
