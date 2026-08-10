import { describe, it, expect } from 'vitest';
import { checkSlots, applySlotAnswer } from '../../../../src/agents/nodes/slot-check';
import { createDefaultTripState } from '../../../../src/agents/nodes/types';
import type { TripState } from '../../../../src/agents/nodes/types';

describe('Slot Check Node', () => {
  it('returns proceed=false with destination question for empty trip state', () => {
    const tripState = createDefaultTripState();
    const result = checkSlots(tripState);

    expect(result.proceed).toBe(false);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].slot).toBe('destination');
    expect(result.missingSlots).toContain('destination');
  });

  it('skips destination slot when cities are filled', () => {
    const tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', order: 0 }, { name: 'Kyoto', order: 1 }],
    };
    const result = checkSlots(tripState);

    expect(result.proceed).toBe(false);
    expect(result.questions[0].slot).toBe('dates');
    expect(result.missingSlots).not.toContain('destination');
  });

  it('skips dates slot when dates are filled', () => {
    const tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', order: 0 }],
      dates: { start: '2024-10-01', end: '2024-10-10', flexible: false },
    };
    const result = checkSlots(tripState);

    // dates + duration both filled (start+end implies duration)
    expect(result.proceed).toBe(false);
    expect(result.questions[0].slot).toBe('travelers');
  });

  it('skips duration when city nights are set', () => {
    const tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', nights: 5, order: 0 }],
      dates: { start: '2024-10-01', end: '2024-10-06', flexible: false },
    };
    const result = checkSlots(tripState);

    expect(result.proceed).toBe(false);
    expect(result.questions[0].slot).toBe('travelers');
  });

  it('proceeds when all required slots are filled', () => {
    const tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', nights: 5, order: 0 }],
      dates: { start: '2024-10-01', end: '2024-10-06', flexible: false },
      travelers: { adults: 2 },
    };
    const result = checkSlots(tripState);

    expect(result.proceed).toBe(true);
    expect(result.questions).toHaveLength(0);
  });

  it('applySlotAnswer fills destination from string', () => {
    const tripState = createDefaultTripState();
    const updated = applySlotAnswer(tripState, 'destination', 'Tokyo, Kyoto, Osaka');

    expect(updated.cities).toHaveLength(3);
    expect(updated.cities[0].name).toBe('Tokyo');
    expect(updated.cities[1].name).toBe('Kyoto');
    expect(updated.cities[2].name).toBe('Osaka');
    expect(updated.onboarding.slotsFilled).toContain('destination');
  });

  it('applySlotAnswer fills dates from object', () => {
    const tripState = createDefaultTripState();
    const updated = applySlotAnswer(tripState, 'dates', {
      start: '2024-10-01',
      end: '2024-10-10',
    });

    expect(updated.dates?.start).toBe('2024-10-01');
    expect(updated.dates?.flexible).toBe(false);
  });

  it('applySlotAnswer distributes nights across cities', () => {
    const tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', order: 0 }, { name: 'Kyoto', order: 1 }],
    };
    const updated = applySlotAnswer(tripState, 'duration', 7);

    expect(updated.cities[0].nights).toBe(4);
    expect(updated.cities[1].nights).toBe(3);
  });

  it('applySlotAnswer marks onboarding complete when all slots filled', () => {
    let tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', nights: 5, order: 0 }],
      dates: { start: '2024-10-01', end: '2024-10-06', flexible: false },
      travelers: { adults: 2 },
    };
    tripState = applySlotAnswer(tripState, 'duration', 5);
    expect(tripState.onboarding.completed).toBe(true);
  });

  it('never re-asks a filled slot', () => {
    const tripState: TripState = {
      ...createDefaultTripState(),
      cities: [{ name: 'Tokyo', nights: 5, order: 0 }],
      dates: { start: '2024-10-01', end: '2024-10-06', flexible: false },
      travelers: { adults: 2 },
    };
    const result = checkSlots(tripState);
    expect(result.missingSlots).not.toContain('destination');
    expect(result.missingSlots).not.toContain('dates');
    expect(result.missingSlots).not.toContain('travelers');
  });
});
