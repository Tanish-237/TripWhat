import { describe, it, expect, vi } from 'vitest';
import { ItineraryBuilderService } from '../../../../src/services/itinerary/builder';
import type { BuildContext } from '../../../../src/services/itinerary/types';

describe('ItineraryBuilderService', () => {
  describe('build (single city)', () => {
    it('builds a single-city itinerary', async () => {
      const builder = new ItineraryBuilderService();
      const ctx: BuildContext = {
        destination: 'Paris',
        duration: 3,
        startDate: '2024-06-01',
        preferences: ['museums', 'food'],
        travelType: 'cultural',
      };

      const result = await builder.build(ctx);

      expect(result).not.toBeNull();
      expect(result!.itinerary.days).toHaveLength(3);
      expect(result!.itinerary.tripMetadata.destination).toBe('Paris');
      expect(result!.itinerary.tripMetadata.preferences).toEqual(['museums', 'food']);
      expect(result!.itinerary.tripMetadata.travelType).toBe('cultural');
      expect(result!.travelMeans).toBeUndefined();
    });

    it('builds without startDate', async () => {
      const builder = new ItineraryBuilderService();
      const ctx: BuildContext = {
        destination: 'Tokyo',
        duration: 5,
      };

      const result = await builder.build(ctx);

      expect(result).not.toBeNull();
      expect(result!.itinerary.days).toHaveLength(5);
    });
  });

  describe('build (multi-city)', () => {
    it('builds a multi-city itinerary with correct day allocation', async () => {
      const builder = new ItineraryBuilderService();
      const ctx: BuildContext = {
        destination: 'Paris',
        duration: 5,
        startDate: '2024-06-01',
        cities: [
          { name: 'Paris', days: 2 },
          { name: 'Lyon', days: 2 },
          { name: 'Nice', days: 1 },
        ],
      };

      const result = await builder.build(ctx);

      expect(result).not.toBeNull();
      expect(result!.itinerary.days).toHaveLength(5);
      expect(result!.itinerary.days[0].location).toBe('Paris');
      expect(result!.itinerary.days[1].location).toBe('Paris');
      expect(result!.itinerary.days[2].location).toBe('Lyon');
      expect(result!.itinerary.days[3].location).toBe('Lyon');
      expect(result!.itinerary.days[4].location).toBe('Nice');
    });
  });

  describe('build with includeTravelMeans', () => {
    it('includes travel means when option is set', async () => {
      const builder = new ItineraryBuilderService();
      const ctx: BuildContext = {
        destination: 'Paris',
        duration: 4,
        startDate: '2024-06-01',
        startLocation: 'London',
        cities: [
          { name: 'Paris', days: 2 },
          { name: 'Lyon', days: 2 },
        ],
        numberOfPeople: 2,
      };

      // Mock the dynamic import of travelMeansService
      vi.doMock('../../../../src/services/travelMeansService', () => ({
        travelMeansService: {
          calculateTravelMeans: vi.fn().mockResolvedValue({
            routes: [],
            totalCost: { min: 100, max: 500, currency: 'USD' },
            totalTravelTime: '5h',
            recommendations: [],
          }),
        },
      }));

      const result = await builder.build(ctx, { includeTravelMeans: true });

      expect(result).not.toBeNull();
      expect(result!.travelMeans).toBeDefined();
      expect(result!.travelMeans.totalCost.currency).toBe('USD');

      vi.doUnmock('../../../../src/services/travelMeansService');
    });

    it('falls back gracefully when travel means fails', async () => {
      const builder = new ItineraryBuilderService();
      const ctx: BuildContext = {
        destination: 'Paris',
        duration: 2,
        cities: [{ name: 'Paris', days: 2 }],
      };

      // Mock travelMeansService to throw
      vi.doMock('../../../../src/services/travelMeansService', () => ({
        travelMeansService: {
          calculateTravelMeans: vi.fn().mockRejectedValue(new Error('API down')),
        },
      }));

      const result = await builder.build(ctx, { includeTravelMeans: true });

      expect(result).not.toBeNull();
      expect(result!.itinerary).toBeDefined();
      expect(result!.travelMeans).toBeUndefined();

      vi.doUnmock('../../../../src/services/travelMeansService');
    });
  });

  describe('Trip model round-trip', () => {
    it('itinerary can be serialized and deserialized', async () => {
      const builder = new ItineraryBuilderService();
      const ctx: BuildContext = {
        destination: 'Paris',
        duration: 2,
        startDate: '2024-06-01',
        preferences: ['food'],
      };

      const result = await builder.build(ctx);
      const serialized = JSON.stringify(result!.itinerary);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.days).toHaveLength(2);
      expect(deserialized.tripMetadata.destination).toBe('Paris');
      expect(deserialized.tripMetadata.startDate).toBe('2024-06-01');
    });
  });
});
