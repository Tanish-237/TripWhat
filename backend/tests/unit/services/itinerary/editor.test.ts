import { describe, it, expect, beforeEach } from 'vitest';
import { ItineraryEditor } from '../../../../src/services/itinerary/editor';
import { createItinerary, createDayPlan, createTimeSlot } from '../../../../src/services/itinerary/types';
import type { Itinerary, Activity } from '../../../../src/services/itinerary/types';

function makeActivity(name: string, pinned = false): Activity {
  return {
    id: `act-${name}`,
    title: name,
    name,
    type: 'attraction',
    location: { name, address: '123 St', coordinates: { lat: 0, lng: 0 } },
    duration: '2h',
    cost: { amount: 20, currency: 'USD', category: 'entrance' },
    metadata: {
      addedBy: 'ai',
      addedAt: new Date().toISOString(),
      source: 'generated',
      pinned,
    },
  };
}

function makeItinerary(cities: { name: string; days: number }[]): Itinerary {
  const itin = createItinerary(cities[0].name, cities.reduce((s, c) => s + c.days, 0), '2024-06-01');
  let dayNum = 1;
  let dayIndex = 0;
  for (const city of cities) {
    for (let d = 0; d < city.days; d++) {
      const day = itin.days[dayIndex];
      day.location = city.name;
      day.title = `Day ${dayNum} - ${city.name}`;
      // Put an activity in morning
      day.timeSlots[0].activity = makeActivity(`${city.name} attraction ${d + 1}`);
      day.timeSlots[0].activities = [day.timeSlots[0].activity];
      dayNum++;
      dayIndex++;
    }
  }
  return itin;
}

describe('ItineraryEditor', () => {
  let editor: ItineraryEditor;

  beforeEach(() => {
    editor = new ItineraryEditor();
  });

  describe('add_city', () => {
    it('adds a new city with specified nights', () => {
      const itin = makeItinerary([{ name: 'Paris', days: 3 }]);
      const result = editor.addCity(itin, { name: 'Lyon', days: 2 });

      expect(result.itinerary.days).toHaveLength(5);
      expect(result.itinerary.days[3].location).toBe('Lyon');
      expect(result.itinerary.days[4].location).toBe('Lyon');
      expect(result.itinerary.tripMetadata.duration).toBe(5);
      expect(result.changeSummary?.added).toContain('Lyon');
    });

    it('inserts city at specific index', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Nice', days: 2 },
      ]);
      const result = editor.addCity(itin, { name: 'Lyon', days: 1 }, 1);

      expect(result.itinerary.days[2].location).toBe('Lyon');
      expect(result.itinerary.days[3].location).toBe('Nice');
      expect(result.itinerary.days).toHaveLength(5);
    });
  });

  describe('remove_city', () => {
    it('removes all days for a city', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Lyon', days: 2 },
        { name: 'Nice', days: 1 },
      ]);
      const result = editor.removeCity(itin, 'Lyon');

      expect(result.itinerary.days).toHaveLength(3);
      expect(result.itinerary.days.every(d => d.location !== 'Lyon')).toBe(true);
      expect(result.itinerary.tripMetadata.duration).toBe(3);
      expect(result.changeSummary?.removed).toContain('Lyon');
    });

    it('renumbers days after removal', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Lyon', days: 2 },
      ]);
      const result = editor.removeCity(itin, 'Paris');

      expect(result.itinerary.days[0].dayNumber).toBe(1);
      expect(result.itinerary.days[1].dayNumber).toBe(2);
      expect(result.itinerary.days[0].location).toBe('Lyon');
    });

    it('throws when city not found', () => {
      const itin = makeItinerary([{ name: 'Paris', days: 2 }]);
      expect(() => editor.removeCity(itin, 'Mars')).toThrow(/not found/i);
    });
  });

  describe('adjust_nights', () => {
    it('increases nights for a city', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Lyon', days: 2 },
      ]);
      const result = editor.adjustNights(itin, 'Paris', 4);

      expect(result.itinerary.days.filter(d => d.location === 'Paris')).toHaveLength(4);
      expect(result.itinerary.days).toHaveLength(6);
      expect(result.itinerary.tripMetadata.duration).toBe(6);
    });

    it('decreases nights for a city', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 4 },
        { name: 'Lyon', days: 2 },
      ]);
      const result = editor.adjustNights(itin, 'Paris', 2);

      expect(result.itinerary.days.filter(d => d.location === 'Paris')).toHaveLength(2);
      expect(result.itinerary.days).toHaveLength(4);
    });

    it('preserves pinned activities when decreasing nights', () => {
      const itin = makeItinerary([{ name: 'Paris', days: 3 }]);
      // Pin an activity on day 3
      itin.days[2].timeSlots[0].activity = makeActivity('Eiffel Tower', true);
      itin.days[2].timeSlots[0].activities = [itin.days[2].timeSlots[0].activity];

      const result = editor.adjustNights(itin, 'Paris', 2);

      // Pinned activity should survive on one of the remaining days
      const allActivities = result.itinerary.days.flatMap(d =>
        d.timeSlots.flatMap(ts => ts.activities || [ts.activity])
      );
      expect(allActivities.some(a => a?.name === 'Eiffel Tower')).toBe(true);
    });
  });

  describe('reorder_cities', () => {
    it('swaps city order', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Lyon', days: 2 },
        { name: 'Nice', days: 2 },
      ]);
      const result = editor.reorderCities(itin, ['Nice', 'Paris', 'Lyon']);

      expect(result.itinerary.days[0].location).toBe('Nice');
      expect(result.itinerary.days[2].location).toBe('Paris');
      expect(result.itinerary.days[4].location).toBe('Lyon');
    });

    it('throws when new order does not match cities', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Lyon', days: 2 },
      ]);
      expect(() => editor.reorderCities(itin, ['Paris'])).toThrow(/mismatch/i);
    });
  });

  describe('rebalance', () => {
    it('redistributes days evenly across cities', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 1 },
        { name: 'Lyon', days: 5 },
      ]);
      const result = editor.rebalance(itin);

      const parisDays = result.itinerary.days.filter(d => d.location === 'Paris').length;
      const lyonDays = result.itinerary.days.filter(d => d.location === 'Lyon').length;
      expect(parisDays).toBe(3);
      expect(lyonDays).toBe(3);
      expect(result.itinerary.days).toHaveLength(6);
    });
  });

  describe('day count invariant', () => {
    it('add_city preserves existing day counts', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 3 },
        { name: 'Lyon', days: 2 },
      ]);
      const result = editor.addCity(itin, { name: 'Nice', days: 2 });
      const parisDays = result.itinerary.days.filter(d => d.location === 'Paris').length;
      const lyonDays = result.itinerary.days.filter(d => d.location === 'Lyon').length;
      expect(parisDays).toBe(3);
      expect(lyonDays).toBe(2);
    });

    it('remove_city preserves other cities day counts', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 3 },
        { name: 'Lyon', days: 2 },
        { name: 'Nice', days: 1 },
      ]);
      const result = editor.removeCity(itin, 'Lyon');
      const parisDays = result.itinerary.days.filter(d => d.location === 'Paris').length;
      const niceDays = result.itinerary.days.filter(d => d.location === 'Nice').length;
      expect(parisDays).toBe(3);
      expect(niceDays).toBe(1);
    });
  });

  describe('pinned survival', () => {
    it('pinned activities survive rebalance', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 1 },
        { name: 'Lyon', days: 5 },
      ]);
      // Pin an activity in Lyon day 1
      itin.days[1].timeSlots[0].activity = makeActivity('Lyon Museum', true);
      itin.days[1].timeSlots[0].activities = [itin.days[1].timeSlots[0].activity];

      const result = editor.rebalance(itin);

      const allActivities = result.itinerary.days.flatMap(d =>
        d.timeSlots.flatMap(ts => ts.activities || [ts.activity])
      );
      expect(allActivities.some(a => a?.name === 'Lyon Museum')).toBe(true);
    });
  });

  describe('signature stability', () => {
    it('unchanged days keep same signature', () => {
      const itin = makeItinerary([
        { name: 'Paris', days: 2 },
        { name: 'Lyon', days: 2 },
      ]);
      // Add signatures
      itin.days.forEach(d => {
        d.signature = `sig-${d.dayNumber}-${d.location}`;
      });

      const result = editor.addCity(itin, { name: 'Nice', days: 1 });

      // Paris and Lyon days should keep their signatures
      expect(result.itinerary.days[0].signature).toBe('sig-1-Paris');
      expect(result.itinerary.days[1].signature).toBe('sig-2-Paris');
      // Lyon days get renumbered but signatures should be preserved from original
      expect(result.itinerary.days[2].signature).toBe('sig-3-Lyon');
      expect(result.itinerary.days[3].signature).toBe('sig-4-Lyon');
    });
  });
});
