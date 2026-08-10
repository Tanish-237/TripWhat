import { v4 as uuidv4 } from 'uuid';

export interface ActivityLocation {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
}

export interface ActivityCost {
  amount: number;
  currency: string;
  category: string;
}

export interface Activity {
  id: string;
  title: string;
  name?: string;
  type: string;
  location: ActivityLocation;
  duration: string;
  cost: ActivityCost | string;
  description?: string;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  xid?: string;
  openingHours?: string[];
  isOpen?: boolean;
  websiteUrl?: string;
  phoneNumber?: string;
  distanceToNext?: string;
  mustVisit?: boolean;
  bestTimeToVisit?: string;
  bookingRequired?: boolean;
  placeId?: string;
  photos?: string[];
  address?: string;
  coordinates?: { lat: number; lng: number };
  metadata?: {
    addedBy: 'ai' | 'user';
    addedAt: string;
    source: 'generated' | 'user_request' | 'suggestion';
    pinned?: boolean;
  };
  travelInfo?: {
    mode: 'FLIGHT' | 'GROUND' | 'MIXED';
    flights?: any[];
    groundTransport?: any[];
    estimatedDuration: string;
    cost: { min: number; max: number; currency: string };
  };
}

export interface TimeSlot {
  id: string;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime: string;
  endTime: string;
  activity: Activity;
  label?: string;
  time?: string;
  activities?: Activity[];
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  subtitle?: string;
  location: string;
  weather?: any;
  timeSlots: TimeSlot[];
  estimatedCost: number;
  highlights: string[];
  tips: string[];
  signature?: string;
}

export interface TripMetadata {
  destination: string;
  startDate?: string;
  endDate?: string;
  duration: number;
  budget?: string | any;
  travelers?: number;
  preferences?: string[];
  travelType?: string;
  localTips?: string[];
  bestSeason?: string;
  startLocation?: string;
  travelMeans?: {
    routes: any[];
    totalCost: { min: number; max: number; currency: string };
    totalTravelTime: string;
    recommendations: any[];
  };
}

export interface Itinerary {
  id: string;
  tripMetadata: TripMetadata;
  days: DayPlan[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryRequest {
  destination: string;
  duration: number;
  startDate?: string;
  budget?: string;
  travelers?: number;
  preferences?: string[];
}

export type ItineraryActionType =
  | 'add'
  | 'remove'
  | 'replace'
  | 'modify'
  | 'move'
  | 'add_city'
  | 'remove_city'
  | 'adjust_nights'
  | 'reorder_cities'
  | 'rebalance';

export interface ItineraryAction {
  type: ItineraryActionType;
  target: {
    day?: number;
    timeSlot?: 'morning' | 'afternoon' | 'evening';
    activityId?: string;
    activityName?: string;
    city?: string;
    cityIndex?: number;
  };
  details?: {
    placeName?: string;
    placeType?: string;
    category?: string[];
    duration?: string;
    time?: string;
    preferences?: string[];
    newDay?: number;
    newTimeSlot?: string;
    nights?: number;
    newCityIndex?: number;
    city?: string;
    cityDays?: number;
  };
}

export interface EditorResult {
  itinerary: Itinerary;
  message: string;
  removedActivity?: Activity;
  addedActivity?: Activity;
  changeSummary?: {
    action: ItineraryActionType;
    target: string;
    added?: string[];
    removed?: string[];
    modified?: string[];
  };
}

export interface BuildContext {
  destination: string;
  duration: number;
  startDate?: string;
  preferences?: string[];
  travelType?: string;
  dailyBudget?: number;
  activityLevel?: 'low' | 'medium' | 'high';
  pacing?: 'relaxed' | 'moderate' | 'fast';
  numberOfPeople?: number;
  startLocation?: string | { name: string; placeId?: string; description?: string };
  cities?: { name: string; days: number }[];
  totalDays?: number;
  budget?: { total: number };
  budgetMode?: string;
  travelPreferences?: {
    preferredAirlines?: string[];
    travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
    maxStops?: number;
    preferDirectFlights?: boolean;
    preferGroundTransport?: boolean;
  };
}

export interface BuildOptions {
  includeTravelMeans?: boolean;
}

export interface BuildResult {
  itinerary: Itinerary;
  travelMeans?: any;
}

export function createTimeSlot(
  period: 'morning' | 'afternoon' | 'evening',
  activity?: Activity
): TimeSlot {
  const times: Record<string, { start: string; end: string }> = {
    morning: { start: '09:00', end: '12:00' },
    afternoon: { start: '14:00', end: '18:00' },
    evening: { start: '19:00', end: '22:00' },
  };
  return {
    id: uuidv4(),
    period,
    startTime: times[period].start,
    endTime: times[period].end,
    activity: activity || ({} as Activity),
    label: period.charAt(0).toUpperCase() + period.slice(1),
    time: `${times[period].start}-${times[period].end}`,
    activities: activity ? [activity] : [],
  };
}

export function createDayPlan(
  dayNumber: number,
  date: string,
  location: string,
  title?: string
): DayPlan {
  return {
    id: uuidv4(),
    dayNumber,
    date,
    title: title || `Day ${dayNumber}`,
    location,
    timeSlots: [
      createTimeSlot('morning'),
      createTimeSlot('afternoon'),
      createTimeSlot('evening'),
    ],
    estimatedCost: 0,
    highlights: [],
    tips: [],
  };
}

export function createItinerary(
  destination: string,
  duration: number,
  startDate?: string
): Itinerary {
  const days: DayPlan[] = [];
  for (let i = 0; i < duration; i++) {
    const date = startDate
      ? new Date(new Date(startDate).getTime() + i * 86400000).toISOString().split('T')[0]
      : '';
    days.push(createDayPlan(i + 1, date, destination));
  }
  return {
    id: uuidv4(),
    tripMetadata: { destination, duration, startDate },
    days,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
