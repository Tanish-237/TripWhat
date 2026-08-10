import type { Itinerary } from '../../services/itinerary/types.js';

export interface ResolvedPlace {
  name: string;
  placeId?: string;
  coordinates?: { lat: number; lng: number };
  country?: string;
  provenance: 'context' | 'baseline' | 'google_places' | 'web_search';
  baselineKey?: string;
}

export interface StructuredQuestion {
  id: string;
  slot: 'destination' | 'dates' | 'duration' | 'travelers' | 'budget' | 'pace' | 'preferences';
  question: string;
  type: 'text' | 'date_picker' | 'nights_stepper' | 'chip_group' | 'segmented_control';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface RouteProposalCity {
  name: string;
  nights: number;
  order: number;
  coordinates?: { lat: number; lng: number };
}

export interface RouteProposal {
  cities: RouteProposalCity[];
  totalNights: number;
  rationale: string;
  alternatives?: { cities: RouteProposalCity[]; rationale: string }[];
}

export interface ChangeEntry {
  type: 'add' | 'remove' | 'modify' | 'move' | 'reorder' | 'rebalance';
  description: string;
  target: string;
}

export interface Widget {
  type: 'plan_cta' | 'route_proposal' | 'question_card' | 'suggestion_chips' | 'change_summary' | 'flight_card' | 'hotel_card';
  data: any;
}

export interface SlotState {
  destination: boolean;
  dates: boolean;
  duration: boolean;
  travelers: boolean;
  budget: boolean;
  pace: boolean;
  preferences: boolean;
}

export interface TripState {
  tripId?: string;
  status: 'planning' | 'upcoming' | 'completed' | 'archived';
  cities: { name: string; nights?: number; order: number }[];
  dates?: { start?: string; end?: string; flexible: boolean; roughMonth?: string };
  travelers?: { adults: number; children?: number };
  budget?: { total?: number; mode: 'capped' | 'flexible' };
  preferences?: string[];
  pace?: 'relaxed' | 'moderate' | 'packed';
  itinerary?: Itinerary | null;
  onboarding: { slotsFilled: string[]; completed: boolean };
  routeProposal?: RouteProposal | null;
  version: number;
}

export const SLOT_ORDER: StructuredQuestion['slot'][] = [
  'destination',
  'dates',
  'duration',
  'travelers',
];

export function createDefaultTripState(): TripState {
  return {
    status: 'planning',
    cities: [],
    onboarding: { slotsFilled: [], completed: false },
    version: 0,
  };
}
