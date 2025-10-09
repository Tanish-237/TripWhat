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
      const coords = await this.getDestinationCoordsPrivate(destination);
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
      const coords = await this.getDestinationCoordsPrivate(destination);
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
   * Build itinerary with trip context and global state tracking (new optimized method)
   */
  async buildItineraryWithContextAndState(
    destination: string,
    duration: number,
    context: {
      dailyBudget: number;
      preferredCategories: string[];
      activityLevel: 'low' | 'medium' | 'high';
      pacing: 'relaxed' | 'moderate' | 'fast';
      numberOfPeople: number;
      places?: any;
      coords?: { lat: number; lon: number };
      globalUsedPlaces: Set<string>;
      startingDayNumber: number;
    }
  ): Promise<Itinerary | null> {
    try {
      console.log(`🎯 [OPTIMIZED ITINERARY] Building ${duration}-day itinerary for ${destination}`);

      let places = context.places;
      
      // If places not provided, fetch them
      if (!places) {
        const coords = context.coords || await this.getDestinationCoords(destination);
        if (!coords) {
          console.error('Failed to geocode destination');
          return null;
        }
        
        places = await this.fetchEnhancedPlaces(
          coords.lat,
          coords.lon,
          context.preferredCategories,
          'leisure', // Default to leisure if not specified
          true // Include hotels
        );
      }

      console.log(`✅ [OPTIMIZED ITINERARY] Using ${places.total} places for ${destination}`);

      // Determine activities per day based on pacing and activity level
      const activitiesPerDay = this.calculateActivitiesPerDay(context.pacing, context.activityLevel);

      // Build daily plans with global state tracking
      const days: DayPlan[] = [];
      for (let dayNum = 1; dayNum <= duration; dayNum++) {
        const actualDayNumber = context.startingDayNumber + dayNum - 1;
        const dayPlan = this.buildOptimizedDayPlan(
          actualDayNumber,
          places,
          context.dailyBudget,
          activitiesPerDay,
          context.numberOfPeople,
          context.globalUsedPlaces
        );
        days.push(dayPlan);
      }

      // Construct itinerary
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

      console.log(`🎉 [OPTIMIZED ITINERARY] Successfully built itinerary for ${destination}`);
      return itinerary;
    } catch (error) {
      console.error('Optimized itinerary builder error:', error);
      return null;
    }
  }

  /**
   * Build optimized day plan with global state tracking and hotel integration
   */
  private buildOptimizedDayPlan(
    dayNumber: number,
    places: any, // Can be old format or new enhanced format
    dailyBudget: number,
    activitiesPerDay: { morning: number; afternoon: number; evening: number },
    numberOfPeople: number,
    globalUsedPlaces: Set<string>
  ): DayPlan {
    let budgetRemaining = dailyBudget * numberOfPeople;
    
    // Handle both old and new place formats
    let activities: Destination[] = [];
    let restaurants: Destination[] = [];
    let hotels: Destination[] = [];
    
    if (places.activities && places.restaurants) {
      // New enhanced format
      activities = places.activities || [];
      restaurants = places.restaurants || [];
      hotels = places.hotels || [];
    } else if (places.all) {
      // Old format - separate activities and restaurants
      restaurants = places.all.filter((p: Destination) => 
        p.category.some(c => c.toLowerCase().includes('restaurant') || 
                            c.toLowerCase().includes('food') || 
                            c.toLowerCase().includes('cafe'))
      );
      activities = places.all.filter((p: Destination) => 
        !p.category.some(c => c.toLowerCase().includes('restaurant') || 
                             c.toLowerCase().includes('food') || 
                             c.toLowerCase().includes('cafe'))
      );
    }

    // Shuffle arrays for variety but maintain consistency with day number seed
    const shuffledActivities = this.shuffleArrayWithSeed([...activities], dayNumber);
    const shuffledRestaurants = this.shuffleArrayWithSeed([...restaurants], dayNumber * 2);
    const shuffledHotels = this.shuffleArrayWithSeed([...hotels], dayNumber * 3);

    // Helper to select unique places with budget consideration
    const selectPlaces = (
      count: number, 
      sourceArray: Destination[], 
      placeType: 'activity' | 'restaurant' | 'hotel' = 'activity'
    ): Destination[] => {
      const selected: Destination[] = [];
      let attempts = 0;
      const maxAttempts = sourceArray.length * 2;

      for (let i = 0; i < sourceArray.length && selected.length < count && attempts < maxAttempts; i++) {
        attempts++;
        const place = sourceArray[i];
        const placeId = `${place.name}-${place.location.latitude}-${place.location.longitude}`;
        
        // Check if place is already used globally
        if (!globalUsedPlaces.has(placeId)) {
          const estimatedCost = this.parseCost(this.estimateCost(place.category)) * numberOfPeople;
          
          if (budgetRemaining >= estimatedCost || estimatedCost === 0) {
            selected.push(place);
            globalUsedPlaces.add(placeId); // Add to global tracking
            budgetRemaining -= estimatedCost;
          }
        }
      }

      // If we couldn't find enough unique places, add affordable repeats as fallback
      if (selected.length < Math.max(1, Math.floor(count / 2))) {
        for (let i = 0; i < sourceArray.length && selected.length < count; i++) {
          const place = sourceArray[i];
          const estimatedCost = this.parseCost(this.estimateCost(place.category)) * numberOfPeople;
          
          if (budgetRemaining >= estimatedCost || estimatedCost === 0) {
            const placeId = `${place.name}-${place.location.latitude}-${place.location.longitude}`;
            if (!selected.some(p => `${p.name}-${p.location.latitude}-${p.location.longitude}` === placeId)) {
              selected.push(place);
              budgetRemaining -= estimatedCost;
            }
          }
        }
      }

      return selected;
    };

    // Generate meaningful day titles with trip progression
    const dayTitles = [
      'Arrival & First Impressions', 'City Discovery', 'Cultural Journey', 'Local Adventures', 
      'Hidden Treasures', 'Art & Heritage', 'Nature & Relaxation', 'Foodie Exploration', 
      'Scenic Wonders', 'Local Life', 'Urban Exploration', 'Farewell Adventures'
    ];
    
    const title = dayTitles[Math.min(dayNumber - 1, dayTitles.length - 1)];

    // Add hotel recommendation for the first day or if it's a longer trip
    const timeSlots = [
      this.buildTimeSlot(
        'morning', 
        '09:00', 
        '12:00', 
        selectPlaces(activitiesPerDay.morning, shuffledActivities, 'activity')
      ),
      this.buildTimeSlot(
        'afternoon', 
        '14:00', 
        '18:00', 
        selectPlaces(activitiesPerDay.afternoon, shuffledActivities, 'activity')
      ),
      this.buildTimeSlot(
        'evening', 
        '19:00', 
        '22:00', 
        selectPlaces(activitiesPerDay.evening, shuffledRestaurants, 'restaurant')
      ),
    ];

    // Add hotel recommendation for multi-day stays (first day or every few days)
    if (dayNumber === 1 || dayNumber % 3 === 1) {
      const hotelRecommendations = selectPlaces(1, shuffledHotels, 'hotel');
      if (hotelRecommendations.length > 0) {
        timeSlots.push(this.buildTimeSlot(
          'night',
          '22:00',
          '23:59',
          hotelRecommendations
        ));
      }
    }

    return {
      dayNumber,
      title,
      timeSlots,
    };
  }

  /**
   * Shuffle array with seed for consistent randomization
   */
  private shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    let temporaryValue, randomIndex;

    // Simple LCG (Linear Congruential Generator)
    const rng = (seed: number) => {
      const a = 1664525;
      const c = 1013904223;
      const m = Math.pow(2, 32);
      return ((a * seed + c) % m) / m;
    };

    while (0 !== currentIndex) {
      randomIndex = Math.floor(rng(seed + currentIndex) * currentIndex);
      currentIndex -= 1;

      temporaryValue = shuffled[currentIndex];
      shuffled[currentIndex] = shuffled[randomIndex];
      shuffled[randomIndex] = temporaryValue;
    }

    return shuffled;
  }

  /**
   * Expose getDestinationCoords as public method
   */
  async getDestinationCoords(destination: string): Promise<{ lat: number; lon: number } | null> {
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
   * Enhanced fetch with hotels and trip-type specific places
   */
  async fetchEnhancedPlaces(
    lat: number,
    lon: number,
    preferredCategories: string[],
    travelType: 'leisure' | 'business' | 'adventure' | 'cultural' | 'family' | 'solo',
    includeHotels: boolean = true
  ): Promise<{
    activities: Destination[];
    restaurants: Destination[];
    hotels: Destination[];
    byCategory: Map<string, Destination[]>;
    total: number;
  }> {
    try {
      // Get base places with enhanced categories based on travel type
      const enhancedCategories = this.getEnhancedCategoriesForTravelType(travelType, preferredCategories);
      
      console.log(`🎯 Enhanced categories for ${travelType}:`, enhancedCategories);
      
      // Fetch diverse places including hotels
      const basePlaces = await this.openTripMapAPI.getItineraryPlaces(lat, lon, 15000); // Larger radius
      
      // Fetch hotels separately if needed
      let hotels: Destination[] = [];
      if (includeHotels) {
        hotels = await this.openTripMapAPI.searchByCategory(lat, lon, 'accomodations', 10000, 10);
      }
      
      // Combine and categorize all places
      const activities = [
        ...basePlaces.attractions,
        ...basePlaces.culture,
        ...basePlaces.nature,
      ].filter(p => p.name);
      
      const restaurants = basePlaces.restaurants.filter(p => p.name);
      
      // Filter activities by enhanced categories
      const filteredActivities = activities.filter(place => {
        const placeCategories = place.category.map(c => c.toLowerCase());
        return enhancedCategories.some(pref => 
          placeCategories.some(cat => cat.includes(pref.toLowerCase()) || pref.toLowerCase().includes(cat))
        );
      });
      
      // Use filtered activities if available, otherwise use all
      const finalActivities = filteredActivities.length > 0 ? filteredActivities : activities;
      
      // Group by category
      const byCategory = new Map<string, Destination[]>();
      [...finalActivities, ...restaurants, ...hotels].forEach(place => {
        place.category.forEach(cat => {
          if (!byCategory.has(cat)) {
            byCategory.set(cat, []);
          }
          byCategory.get(cat)!.push(place);
        });
      });

      return {
        activities: finalActivities,
        restaurants,
        hotels,
        byCategory,
        total: finalActivities.length + restaurants.length + hotels.length
      };
    } catch (error) {
      console.error('Enhanced places fetch error:', error);
      return {
        activities: [],
        restaurants: [],
        hotels: [],
        byCategory: new Map(),
        total: 0
      };
    }
  }

  /**
   * Get enhanced categories based on travel type
   */
  private getEnhancedCategoriesForTravelType(
    travelType: string,
    baseCategories: string[]
  ): string[] {
    const travelTypeCategories: Record<string, string[]> = {
      business: [
        'restaurants', 'cafes', 'hotels', 'cultural', 'museums', 
        'architecture', 'historic', 'urban_environment'
      ],
      leisure: [
        'beaches', 'parks', 'museums', 'restaurants', 'shopping', 
        'natural', 'amusement_parks', 'recreation'
      ],
      adventure: [
        'natural', 'sport', 'climbing', 'interesting_places', 
        'amusement_parks', 'recreation', 'geology'
      ],
      cultural: [
        'museums', 'historic', 'architecture', 'theatres_and_entertainments', 
        'cultural', 'religion', 'archaeology'
      ],
      family: [
        'amusement_parks', 'parks', 'museums', 'restaurants', 
        'interesting_places', 'natural', 'recreation'
      ],
      solo: [
        'museums', 'cafes', 'parks', 'interesting_places', 
        'cultural', 'restaurants', 'galleries'
      ]
    };

    const typeSpecific = travelTypeCategories[travelType] || [];
    return [...new Set([...baseCategories, ...typeSpecific])];
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
   * Build a day plan with budget awareness and proper activity distribution
   */
  private buildBudgetAwareDayPlan(
    dayNumber: number,
    places: { all: Destination[]; byCategory: Map<string, Destination[]>; total: number },
    dailyBudget: number,
    activitiesPerDay: { morning: number; afternoon: number; evening: number },
    numberOfPeople: number
  ): DayPlan {
    let budgetRemaining = dailyBudget * numberOfPeople;
    
    // Separate restaurants from other activities
    const restaurants = places.all.filter(p => 
      p.category.some(c => c.toLowerCase().includes('restaurant') || c.toLowerCase().includes('food'))
    );
    const activities = places.all.filter(p => 
      !p.category.some(c => c.toLowerCase().includes('restaurant') || c.toLowerCase().includes('food'))
    );

    // Shuffle arrays for variety
    const shuffledActivities = this.shuffleArray([...activities]);
    const shuffledRestaurants = this.shuffleArray([...restaurants]);

    // Track used places globally to avoid repetition across days
    const usedActivities = new Set<string>();
    const usedRestaurants = new Set<string>();

    // Helper to select unique places with budget consideration
    const selectPlaces = (
      count: number, 
      sourceArray: Destination[], 
      usedSet: Set<string>
    ): Destination[] => {
      const selected: Destination[] = [];
      let attempts = 0;
      const maxAttempts = sourceArray.length * 2; // Prevent infinite loops

      for (let i = 0; i < sourceArray.length && selected.length < count && attempts < maxAttempts; i++) {
        attempts++;
        const place = sourceArray[i];
        const placeId = `${place.name}-${place.location.latitude}-${place.location.longitude}`;
        
        if (!usedSet.has(placeId)) {
          // Estimate cost for this activity
          const estimatedCost = this.parseCost(this.estimateCost(place.category)) * numberOfPeople;
          
          // Check if we can afford this activity (or if it's free)
          if (budgetRemaining >= estimatedCost || estimatedCost === 0) {
            selected.push(place);
            usedSet.add(placeId);
            budgetRemaining -= estimatedCost;
          }
        }
      }

      // If we didn't get enough activities due to budget or uniqueness constraints,
      // fill with remaining affordable options (allow some repetition if necessary)
      if (selected.length < count && selected.length < Math.max(1, Math.floor(count / 2))) {
        for (let i = 0; i < sourceArray.length && selected.length < count; i++) {
          const place = sourceArray[i];
          const estimatedCost = this.parseCost(this.estimateCost(place.category)) * numberOfPeople;
          
          if (budgetRemaining >= estimatedCost || estimatedCost === 0) {
            const placeId = `${place.name}-${place.location.latitude}-${place.location.longitude}`;
            if (!selected.some(p => `${p.name}-${p.location.latitude}-${p.location.longitude}` === placeId)) {
              selected.push(place);
              budgetRemaining -= estimatedCost;
            }
          }
        }
      }

      return selected;
    };

    // Generate meaningful day titles
    const dayTitles = [
      'City Discovery', 'Cultural Journey', 'Local Adventures', 'Hidden Treasures',
      'Art & Heritage', 'Nature & Relaxation', 'Foodie Exploration', 'Scenic Wonders',
      'Local Life', 'Final Adventures'
    ];
    
    const title = dayTitles[(dayNumber - 1) % dayTitles.length];

    return {
      dayNumber,
      title,
      timeSlots: [
        this.buildTimeSlot(
          'morning', 
          '09:00', 
          '12:00', 
          selectPlaces(activitiesPerDay.morning, shuffledActivities, usedActivities)
        ),
        this.buildTimeSlot(
          'afternoon', 
          '14:00', 
          '18:00', 
          selectPlaces(activitiesPerDay.afternoon, shuffledActivities, usedActivities)
        ),
        this.buildTimeSlot(
          'evening', 
          '19:00', 
          '22:00', 
          selectPlaces(activitiesPerDay.evening, shuffledRestaurants, usedRestaurants)
        ),
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
   * Get coordinates for a destination name (kept for backward compatibility)
   */
  private async getDestinationCoordsPrivate(destination: string): Promise<{ lat: number; lon: number } | null> {
    return this.getDestinationCoords(destination);
  }

  /**
   * Build a single day plan with morning/afternoon/evening activities
   * Ensures diverse activities across all days by proper distribution
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
    // Combine all non-restaurant places for activities
    const allActivities = [
      ...places.attractions,
      ...places.culture,
      ...places.nature,
    ].filter(p => p.name); // Filter out places without names

    // Shuffle the arrays to ensure variety across days
    const shuffledActivities = this.shuffleArray([...allActivities]);
    const shuffledRestaurants = this.shuffleArray([...places.restaurants]);

    // Calculate unique distribution for each day
    const activitiesPerSlot = 2;
    const restaurantsPerSlot = 2;
    
    // Distribute activities uniquely across days
    const baseIndex = (dayNumber - 1) * (activitiesPerSlot * 2); // 2 slots (morning, afternoon)
    const restaurantIndex = (dayNumber - 1) * restaurantsPerSlot;

    // Get unique activities for this day, cycling through if needed
    const getMorningActivities = () => {
      const startIdx = baseIndex % shuffledActivities.length;
      const activities = [];
      for (let i = 0; i < activitiesPerSlot && shuffledActivities.length > 0; i++) {
        const idx = (startIdx + i) % shuffledActivities.length;
        activities.push(shuffledActivities[idx]);
      }
      return activities;
    };

    const getAfternoonActivities = () => {
      const startIdx = (baseIndex + activitiesPerSlot) % shuffledActivities.length;
      const activities = [];
      for (let i = 0; i < activitiesPerSlot && shuffledActivities.length > 0; i++) {
        const idx = (startIdx + i) % shuffledActivities.length;
        activities.push(shuffledActivities[idx]);
      }
      return activities;
    };

    const getEveningActivities = () => {
      const startIdx = restaurantIndex % shuffledRestaurants.length;
      const activities = [];
      for (let i = 0; i < restaurantsPerSlot && shuffledRestaurants.length > 0; i++) {
        const idx = (startIdx + i) % shuffledRestaurants.length;
        activities.push(shuffledRestaurants[idx]);
      }
      return activities;
    };

    // Generate meaningful day titles based on activities
    const dayTitles = [
      'Explore the City', 'Cultural Immersion', 'Natural Wonders', 'Local Experiences',
      'Hidden Gems', 'Art & History', 'Adventure Day', 'Relaxation & Fun',
      'Local Flavors', 'Scenic Discoveries'
    ];
    
    const title = dayTitles[(dayNumber - 1) % dayTitles.length];

    return {
      dayNumber,
      title,
      timeSlots: [
        this.buildTimeSlot('morning', '09:00', '12:00', getMorningActivities()),
        this.buildTimeSlot('afternoon', '14:00', '18:00', getAfternoonActivities()),
        this.buildTimeSlot('evening', '19:00', '22:00', getEveningActivities()),
      ],
    };
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
   * Convert Destination to Activity with enhanced image and details
   */
  private destinationToActivity(destination: Destination): Activity {
    // Estimate duration based on category
    const duration = this.estimateDuration(destination.category);
    const cost = this.estimateCost(destination.category);
    
    // Generate better image URL based on category and name
    const imageUrl = this.generateImageUrl(destination);

    const activity = {
      id: uuidv4(),
      name: destination.name,
      location: {
        lat: destination.location.latitude,
        lon: destination.location.longitude,
        address: destination.address || undefined,
      },
      duration,
      estimatedCost: cost,
      category: destination.category[0] || 'attraction',
      description: destination.description || this.generateDescription(destination),
      rating: destination.rating,
      imageUrl,
      kinds: destination.category,
      xid: destination.id,
    };

    console.log('🎯 [ACTIVITY] Created activity:', activity.name, 'with imageUrl:', activity.imageUrl);
    
    return activity;
  }

  /**
   * Generate highly accurate and fast-loading image URLs for activities
   */
  private generateImageUrl(destination: Destination): string {
    console.log('🖼️ [IMAGE] Generating accurate image URL for:', destination.name, 'category:', destination.category);
    
    // Use existing image if available
    if (destination.image && destination.image !== '') {
      console.log('🖼️ [IMAGE] Using existing image:', destination.image);
      return destination.image;
    }

    // Enhanced image generation based on place name and category
    const placeName = destination.name.toLowerCase();
    const category = destination.category[0]?.toLowerCase() || 'travel';
    
    // Specific place-based image queries for better accuracy
    let imageQuery = '';
    
    if (placeName.includes('museum') || category.includes('museum')) {
      imageQuery = 'museum-interior-art-exhibits-gallery';
    } else if (placeName.includes('park') || placeName.includes('garden') || category.includes('park')) {
      imageQuery = 'beautiful-city-park-green-nature';
    } else if (placeName.includes('church') || placeName.includes('cathedral') || category.includes('church')) {
      imageQuery = 'historic-church-cathedral-architecture';
    } else if (placeName.includes('tower') || placeName.includes('monument') || category.includes('monument')) {
      imageQuery = 'historic-tower-monument-architecture';
    } else if (placeName.includes('restaurant') || placeName.includes('cafe') || category.includes('restaurant')) {
      imageQuery = 'elegant-restaurant-dining-atmosphere';
    } else if (placeName.includes('market') || placeName.includes('shopping') || category.includes('shopping')) {
      imageQuery = 'vibrant-market-shopping-colorful';
    } else if (placeName.includes('bridge') || category.includes('bridge')) {
      imageQuery = 'beautiful-city-bridge-architecture';
    } else if (placeName.includes('square') || placeName.includes('plaza')) {
      imageQuery = 'city-square-plaza-urban-architecture';
    } else if (placeName.includes('hotel') || category.includes('hotel')) {
      imageQuery = 'luxury-hotel-elegant-interior';
    } else if (placeName.includes('beach') || placeName.includes('ocean') || category.includes('beach')) {
      imageQuery = 'pristine-beach-ocean-paradise';
    } else if (placeName.includes('mountain') || placeName.includes('hill') || category.includes('natural')) {
      imageQuery = 'mountain-landscape-scenic-nature';
    } else if (placeName.includes('library') || category.includes('library')) {
      imageQuery = 'beautiful-library-books-architecture';
    } else if (placeName.includes('theater') || placeName.includes('theatre') || category.includes('theatre')) {
      imageQuery = 'elegant-theater-performance-interior';
    } else {
      // Generic high-quality travel image
      imageQuery = 'beautiful-travel-destination-landmark';
    }
    
    // Use optimized parameters for faster loading and better quality
    const imageUrl = `https://source.unsplash.com/800x600/?${imageQuery}&auto=format&fit=crop&w=800&h=600&q=80`;
    console.log('🖼️ [IMAGE] Generated accurate URL:', imageUrl);
    
    return imageUrl;
  }

  /**
   * Generate description for places without descriptions
   */
  private generateDescription(destination: Destination): string {
    const category = destination.category[0]?.toLowerCase() || 'attraction';
    const name = destination.name;
    
    const descriptions: Record<string, string> = {
      'restaurant': `Experience authentic local cuisine at ${name}, offering a delightful dining experience.`,
      'cafe': `Relax and enjoy quality coffee and light meals at ${name}, perfect for a break.`,
      'museum': `Discover fascinating exhibits and cultural treasures at ${name}.`,
      'park': `Enjoy nature and outdoor activities at ${name}, a beautiful green space.`,
      'church': `Visit the historic and architecturally significant ${name}.`,
      'monument': `Explore the historic significance and beauty of ${name}.`,
      'beach': `Relax and enjoy the sun, sand, and sea at the beautiful ${name}.`,
      'hotel': `Comfortable accommodation with excellent amenities at ${name}.`,
      'theatre': `Experience world-class entertainment and performances at ${name}.`,
      'shopping': `Discover unique items and local products at ${name}.`,
    };

    return descriptions[category] || `Visit the interesting ${name}, a notable local attraction.`;
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

  /**
   * Expose fetchCategoryFilteredPlaces as public method (backward compatibility)
   */
  async fetchCategoryFilteredPlaces(
    lat: number,
    lon: number,
    preferredCategories: string[]
  ): Promise<{
    all: Destination[];
    byCategory: Map<string, Destination[]>;
    total: number;
  }> {
    const enhanced = await this.fetchEnhancedPlaces(lat, lon, preferredCategories, 'leisure', false);
    return {
      all: [...enhanced.activities, ...enhanced.restaurants],
      byCategory: enhanced.byCategory,
      total: enhanced.activities.length + enhanced.restaurants.length
    };
  }
}

// Singleton instance
export const itineraryBuilder = new ItineraryBuilder();
