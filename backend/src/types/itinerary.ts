/**
 * Itinerary Type Definitions for TripWhat
 * Structured data format for multi-day trip planning
 */

export interface TripMetadata {
  destination: string;
  startDate?: string; // ISO format: "2024-05-15"
  endDate?: string;
  duration: number; // number of days
  budget?: string | any; // e.g., "$500", "€1000", or budget object
  travelers?: number;
  preferences?: string[]; // e.g., ["museums", "food", "nightlife"]
  travelType?: string; // e.g., "cultural", "leisure", "adventure"
  localTips?: string[]; // Local tips from web search
  bestSeason?: string; // Best time to visit
  startLocation?: string; // Starting point for multi-city trips
  travelMeans?: {
    routes: any[]; // TravelRoute array
    totalCost: {
      min: number;
      max: number;
      currency: string;
    };
    totalTravelTime: string;
    recommendations: any[]; // TravelRecommendation array
  };
}

export interface Activity {
  id: string;
  title: string; // Changed from 'name' to match the activity structure
  name?: string; // Keep for backward compatibility
  type: string; // e.g., "attraction", "restaurant", "hotel", "transport", "travel"
  location: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  duration: string; // e.g., "2h", "1.5h"
  cost: {
    amount: number;
    currency: string;
    category: string; // e.g., "entrance", "transport", "food"
  };
  description?: string;
  rating?: number; // 1-5 stars (Google Places uses 1-5)
  imageUrl?: string;
  tags?: string[]; // Tags from web search
  xid?: string; // OpenTripMap ID for fetching more details
  openingHours?: string[]; // e.g., ["Mon: 9AM-5PM", "Tue: 9AM-5PM"]
  isOpen?: boolean; // Currently open?
  websiteUrl?: string;
  phoneNumber?: string;
  distanceToNext?: string; // e.g., "500m (5 min walk)"
  mustVisit?: boolean; // Is this a must-visit attraction?
  bestTimeToVisit?: string; // Best time to visit this place
  bookingRequired?: boolean; // Whether booking is required
  travelInfo?: {
    mode: "FLIGHT" | "GROUND" | "MIXED";
    flights?: any[]; // FlightOffer array
    groundTransport?: any[]; // GroundTransportOption array
    estimatedDuration: string;
    cost: {
      min: number;
      max: number;
      currency: string;
    };
  };
}

export interface TimeSlot {
  id: string;
  period: "morning" | "afternoon" | "evening" | "night";
  startTime: string; // "09:00"
  endTime: string; // "12:00"
  activity: Activity; // Changed from activities array to single activity
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date: string; // ISO format: "2024-05-15"
  title: string; // e.g., "Historic Paris", "Montmartre & Art"
  subtitle?: string;
  location: string; // Main location for the day
  weather?: any; // Weather information
  timeSlots: TimeSlot[];
  estimatedCost: number;
  highlights: string[];
  tips: string[];
}

export interface Itinerary {
  id: string; // UUID
  tripMetadata: TripMetadata;
  days: DayPlan[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request format from frontend
 */
export interface ItineraryRequest {
  destination: string;
  duration: number;
  startDate?: string;
  budget?: string;
  travelers?: number;
  preferences?: string[];
}

/**
 * Agent output format (before formatting into Itinerary)
 */
export interface AgentItineraryOutput {
  destination: string;
  duration: number;
  days: Array<{
    dayNumber: number;
    title: string;
    morning?: Activity[];
    afternoon?: Activity[];
    evening?: Activity[];
  }>;
}
