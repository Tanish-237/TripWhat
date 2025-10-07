/**
 * Itinerary Type Definitions for TripWhat
 * Structured data format for multi-day trip planning
 */

export interface TripMetadata {
  destination: string;
  startDate?: string; // ISO format: "2024-05-15"
  endDate?: string;
  duration: number; // number of days
  budget?: string; // e.g., "$500", "€1000"
  travelers?: number;
  preferences?: string[]; // e.g., ["museums", "food", "nightlife"]
}

export interface Activity {
  id: string;
  name: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  duration: string; // e.g., "2h", "1.5h"
  estimatedCost?: string; // e.g., "$20", "€15", "Free"
  category: string; // e.g., "attraction", "restaurant", "hotel", "transport"
  description?: string;
  rating?: number; // 1-3 stars
  imageUrl?: string;
  kinds?: string[]; // tags like "museums", "historic", "architecture"
  xid?: string; // OpenTripMap ID for fetching more details
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
