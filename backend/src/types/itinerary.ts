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
}

export interface Activity {
  id: string;
  name: string;
  location?: {
    lat?: number;
    lon?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  duration: string; // e.g., "2h", "1.5h"
  estimatedCost?: string; // e.g., "$20", "€15", "Free"
  category: string; // e.g., "attraction", "restaurant", "hotel", "transport"
  description?: string;
  rating?: number; // 1-5 stars (Google Places uses 1-5)
  imageUrl?: string;
  kinds?: string[]; // tags like "museums", "historic", "architecture"
  tags?: string[]; // Additional tags from web search
  xid?: string; // OpenTripMap ID for fetching more details
  openingHours?: string[]; // e.g., ["Mon: 9AM-5PM", "Tue: 9AM-5PM"]
  isOpen?: boolean; // Currently open?
  websiteUrl?: string;
  phoneNumber?: string;
  distanceToNext?: string; // e.g., "500m (5 min walk)"
  mustVisit?: boolean; // Is this a must-visit attraction?
  bestTimeToVisit?: string; // Best time to visit this place
}

export interface TimeSlot {
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime: string; // "09:00"
  endTime: string; // "12:00"
  activities: Activity[];
}

export interface DayPlan {
  dayNumber: number;
  date?: string; // ISO format: "2024-05-15"
  title: string; // e.g., "Historic Paris", "Montmartre & Art"
  description?: string;
  timeSlots: TimeSlot[];
  localTip?: string; // Tip specific to this day
  city?: string; // City name for multi-city trips
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
