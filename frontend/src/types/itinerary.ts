/**
 * Itinerary Type Definitions for TripWhat Frontend
 * Matches backend types from backend/src/types/itinerary.ts
 */

export interface TripMetadata {
  destination: string;
  startDate?: string;
  endDate?: string;
  duration: number;
  budget?: string;
  travelers?: number;
  preferences?: string[];
}

export interface Activity {
  id: string;
  name: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  duration: string;
  estimatedCost?: string;
  category: string;
  description?: string;
  rating?: number;
  imageUrl?: string;
  kinds?: string[];
  xid?: string;
}

export interface TimeSlot {
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime: string;
  endTime: string;
  activities: Activity[];
}

export interface DayPlan {
  dayNumber: number;
  date?: string;
  title: string;
  description?: string;
  timeSlots: TimeSlot[];
}

export interface Itinerary {
  id: string;
  tripMetadata: TripMetadata;
  days: DayPlan[];
  createdAt: Date;
  updatedAt: Date;
}
