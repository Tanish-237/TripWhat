import { describe, it, expect } from 'vitest';
import { itineraryBuilderService } from '../../../../src/services/itinerary/builder';
import { createItinerary, createDayPlan } from '../../../../src/services/itinerary/types';
import type { Itinerary, DayPlan, Activity } from '../../../../src/services/itinerary/types';

function makeActivity(name: string, pinned: boolean = false): Activity {
  return {
    id: `act-${name}`,
    title: name,
    name,
    type: 'attraction',
    location: { name, address: '123 St', coordinates: { lat: 0, lng: 0 } },
    duration: '2h',
    cost: { amount: 0, currency: 'USD', category: 'free' },
    metadata: {
      addedBy: pinned ? 'user' : 'ai',
      addedAt: new Date().toISOString(),
      source: pinned ? 'user_request' : 'generated',
      pinned,
    },
  };
}

function makeDay(city: string, dayNum: number, activities: Activity[] = []): DayPlan {
  const day = createDayPlan(dayNum, '', city);
  if (activities.length > 0 && day.timeSlots[0]) {
    day.timeSlots[0].activity = activities[0];
    day.timeSlots[0].activities = activities;
  }
  day.signature = itineraryBuilderService.computeDaySignature(day);
  return day;
}

describe('Delta-Only Builder', () => {
  it('computes deterministic signatures for identical days', () => {
    const day1 = makeDay('Tokyo', 1);
    const day2 = makeDay('Tokyo', 1);
    expect(day1.signature).toBe(day2.signature);
  });

  it('computes different signatures for different cities', () => {
    const day1 = makeDay('Tokyo', 1);
    const day2 = makeDay('Kyoto', 1);
    expect(day1.signature).not.toBe(day2.signature);
  });

  it('reuses days with matching signatures (no regeneration)', async () => {
    const existingDay = makeDay('Tokyo', 1, [makeActivity('Sensoji Temple')]);
    const itinerary: Itinerary = createItinerary('Tokyo', 1, '2024-10-01');
    itinerary.days = [existingDay];

    const requiredDay = makeDay('Tokyo', 1);
    const result = await itineraryBuilderService.buildDelta(itinerary, [requiredDay]);

    expect(result.reusedDayKeys).toHaveLength(1);
    expect(result.newDayKeys).toHaveLength(0);
    // Existing day should be preserved verbatim
    const reusedDay = result.itinerary.days[0];
    expect(reusedDay.timeSlots[0].activity?.name).toBe('Sensoji Temple');
  });

  it('generates new days when signatures do not match', async () => {
    const existingDay = makeDay('Tokyo', 1);
    const itinerary: Itinerary = createItinerary('Tokyo', 1, '2024-10-01');
    itinerary.days = [existingDay];

    const requiredDay = makeDay('Kyoto', 1);
    const result = await itineraryBuilderService.buildDelta(itinerary, [requiredDay]);

    expect(result.reusedDayKeys).toHaveLength(0);
    expect(result.newDayKeys).toHaveLength(1);
  });

  it('invalidates only specified cities', async () => {
    const tokyoDay = makeDay('Tokyo', 1, [makeActivity('Sensoji')]);
    const kyotoDay = makeDay('Kyoto', 2, [makeActivity('Fushimi Inari')]);
    const itinerary: Itinerary = createItinerary('Tokyo', 2, '2024-10-01');
    itinerary.days = [tokyoDay, kyotoDay];

    // Required days must match existing signatures for reuse to work
    const requiredTokyo = makeDay('Tokyo', 1, [makeActivity('Sensoji')]);
    const requiredKyoto = makeDay('Kyoto', 2, [makeActivity('Fushimi Inari')]);
    const result = await itineraryBuilderService.buildDelta(itinerary, [requiredTokyo, requiredKyoto], ['Kyoto']);

    expect(result.reusedDayKeys).toHaveLength(1);
    expect(result.newDayKeys).toHaveLength(1);
  });

  it('preserves pinned activities from invalidated days', async () => {
    const pinnedActivity = makeActivity('Must-See Shrine', true);
    const tokyoDay = makeDay('Tokyo', 1, [pinnedActivity]);
    const itinerary: Itinerary = createItinerary('Tokyo', 1, '2024-10-01');
    itinerary.days = [tokyoDay];

    const requiredDay = makeDay('Tokyo', 1);
    const result = await itineraryBuilderService.buildDelta(itinerary, [requiredDay], ['Tokyo']);

    // Pinned activity should be re-inserted
    const newDay = result.itinerary.days[0];
    const allActivities = newDay.timeSlots.flatMap((ts: any) => ts.activities || []);
    const pinned = allActivities.find((a: Activity) => a.metadata?.pinned);
    expect(pinned).toBeDefined();
    expect(pinned?.name).toBe('Must-See Shrine');
  });

  it('builds fresh itinerary when no existing itinerary', async () => {
    const requiredDays = [makeDay('Tokyo', 1), makeDay('Tokyo', 2)];
    // Pass undefined as existing itinerary — buildDelta should handle null
    const result = await itineraryBuilderService.buildDelta(null, requiredDays);

    expect(result.itinerary.days).toHaveLength(2);
    expect(result.reusedDayKeys).toHaveLength(0);
    expect(result.newDayKeys).toHaveLength(2);
  });

  it('renumbers days correctly after delta build', async () => {
    const existingDay = makeDay('Tokyo', 1);
    const itinerary: Itinerary = createItinerary('Tokyo', 1, '2024-10-01');
    itinerary.days = [existingDay];

    const requiredDays = [makeDay('Tokyo', 1), makeDay('Kyoto', 2), makeDay('Osaka', 3)];
    const result = await itineraryBuilderService.buildDelta(itinerary, requiredDays);

    expect(result.itinerary.days[0].dayNumber).toBe(1);
    expect(result.itinerary.days[1].dayNumber).toBe(2);
    expect(result.itinerary.days[2].dayNumber).toBe(3);
  });
});
