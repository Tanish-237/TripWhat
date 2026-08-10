import type { StructuredQuestion, TripState, SlotState } from './types.js';
import { SLOT_ORDER } from './types.js';

interface SlotCheckResult {
  proceed: boolean;
  questions: StructuredQuestion[];
  missingSlots: string[];
}

/**
 * Slot Check Node
 * 
 * Given intent + trip state, determines whether all required onboarding slots
 * are filled. If any are missing, returns structured questions that render
 * as UI cards (date picker, nights stepper, chip groups) instead of prose.
 * 
 * Rules:
 * - Slots already known from prior conversation are NEVER re-asked
 * - Free-text answers between cards feed back through classify_node
 * - User can exit slot flow back to free chat at any time; filled slots persist
 */
export function checkSlots(tripState: TripState): SlotCheckResult {
  const filled = getFilledSlots(tripState);
  const missing: string[] = [];

  for (const slot of SLOT_ORDER) {
    if (!filled[slot]) {
      missing.push(slot);
    }
  }

  if (missing.length === 0) {
    return { proceed: true, questions: [], missingSlots: [] };
  }

  // Only ask about the FIRST missing slot (one card per turn)
  const firstMissing = missing[0];
  const question = createQuestionForSlot(firstMissing as StructuredQuestion['slot'], tripState);

  return {
    proceed: false,
    questions: [question],
    missingSlots: missing,
  };
}

function getFilledSlots(tripState: TripState): SlotState {
  return {
    destination: tripState.cities.length > 0,
    dates: !!(tripState.dates && (tripState.dates.start || tripState.dates.flexible)),
    duration: tripState.cities.some(c => c.nights !== undefined && c.nights > 0)
      || !!(tripState.dates?.start && tripState.dates?.end),
    travelers: !!(tripState.travelers && tripState.travelers.adults > 0),
    budget: !!(tripState.budget && (tripState.budget.total !== undefined || tripState.budget.mode)),
    pace: !!tripState.pace,
    preferences: !!(tripState.preferences && tripState.preferences.length > 0),
  };
}

function createQuestionForSlot(
  slot: StructuredQuestion['slot'],
  tripState: TripState
): StructuredQuestion {
  const id = `slot-${slot}-${Date.now()}`;

  switch (slot) {
    case 'destination':
      return {
        id,
        slot: 'destination',
        question: 'Where would you like to go?',
        type: 'text',
        placeholder: 'e.g., Tokyo, Kyoto, and Osaka',
      };

    case 'dates':
      return {
        id,
        slot: 'dates',
        question: 'When are you planning to travel?',
        type: 'segmented_control',
        options: [
          { label: 'I have dates', value: 'fixed' },
          { label: 'Flexible', value: 'flexible' },
          { label: 'Not sure yet', value: 'unsure' },
        ],
      };

    case 'duration':
      return {
        id,
        slot: 'duration',
        question: 'How many days do you have for this trip?',
        type: 'nights_stepper',
        placeholder: 'e.g., 12 days',
      };

    case 'travelers':
      return {
        id,
        slot: 'travelers',
        question: "Who's going and what's the vibe?",
        type: 'chip_group',
        options: [
          { label: 'Solo', value: 'solo' },
          { label: 'Couple', value: 'couple' },
          { label: 'Family', value: 'family' },
          { label: 'Friends', value: 'friends' },
          { label: 'Group', value: 'group' },
        ],
      };

    case 'budget':
      return {
        id,
        slot: 'budget',
        question: 'What\'s your budget style?',
        type: 'chip_group',
        options: [
          { label: 'Budget', value: 'budget' },
          { label: 'Mid-range', value: 'mid-range' },
          { label: 'Luxury', value: 'luxury' },
        ],
      };

    case 'pace':
      return {
        id,
        slot: 'pace',
        question: 'How do you like to travel?',
        type: 'chip_group',
        options: [
          { label: 'Relaxed', value: 'relaxed' },
          { label: 'Moderate', value: 'moderate' },
          { label: 'Packed', value: 'packed' },
        ],
      };

    default:
      return {
        id,
        slot: 'destination',
        question: 'Where would you like to go?',
        type: 'text',
      };
  }
}

/**
 * Update trip state with a slot answer
 */
export function applySlotAnswer(
  tripState: TripState,
  slot: StructuredQuestion['slot'],
  answer: any
): TripState {
  const updated = { ...tripState };
  updated.onboarding = { ...tripState.onboarding };

  switch (slot) {
    case 'destination':
      if (Array.isArray(answer)) {
        updated.cities = answer.map((name: string, i: number) => ({
          name,
          order: i,
        }));
      } else if (typeof answer === 'string') {
        updated.cities = answer.split(',').map((name: string) => name.trim()).filter(Boolean).map((name, i) => ({
          name,
          order: i,
        }));
      }
      break;

    case 'dates':
      if (typeof answer === 'object' && answer.start) {
        updated.dates = {
          start: answer.start,
          end: answer.end,
          flexible: false,
        };
      } else if (answer === 'flexible' || answer?.flexible) {
        updated.dates = {
          flexible: true,
          roughMonth: answer?.roughMonth,
        };
      }
      break;

    case 'duration':
      if (typeof answer === 'number' && answer > 0) {
        // Distribute nights across existing cities evenly
        const cityCount = updated.cities.length || 1;
        const perCity = Math.floor(answer / cityCount);
        const remainder = answer % cityCount;
        updated.cities = updated.cities.map((c, i) => ({
          ...c,
          nights: perCity + (i < remainder ? 1 : 0),
        }));
      }
      break;

    case 'travelers':
      if (typeof answer === 'string') {
        const travelerMap: Record<string, { adults: number; children?: number }> = {
          solo: { adults: 1 },
          couple: { adults: 2 },
          family: { adults: 2, children: 2 },
          friends: { adults: 3 },
          group: { adults: 5 },
        };
        updated.travelers = travelerMap[answer] || { adults: 2 };
      }
      break;

    case 'budget':
      if (typeof answer === 'string') {
        updated.budget = {
          mode: answer === 'luxury' ? 'flexible' : 'capped',
          total: answer === 'budget' ? 1000 : answer === 'mid-range' ? 3000 : 8000,
        };
      }
      break;

    case 'pace':
      if (typeof answer === 'string') {
        updated.pace = answer as 'relaxed' | 'moderate' | 'packed';
      }
      break;
  }

  // Track filled slots
  if (!updated.onboarding.slotsFilled.includes(slot)) {
    updated.onboarding.slotsFilled.push(slot);
  }

  // Check if onboarding is complete
  const filled = getFilledSlots(updated);
  const allFilled = SLOT_ORDER.every(s => filled[s]);
  updated.onboarding.completed = allFilled;

  return updated;
}
