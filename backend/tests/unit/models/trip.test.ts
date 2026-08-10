import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Trip } from '../../../src/models/Trip';

let mongoServer: MongoMemoryServer;

beforeEach(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Trip Model Round-Trip', () => {
  it('saves and retrieves a trip with full itinerary', async () => {
    const tripData = {
      user: new mongoose.Types.ObjectId(),
      title: 'Paris Adventure',
      description: 'A week in Paris',
      startDate: new Date('2024-06-01'),
      cities: [{ name: 'Paris', days: 5 }],
      totalDays: 5,
      people: 2,
      travelType: 'cultural',
      budget: {
        total: 3000,
        travel: 800,
        accommodation: 1000,
        food: 600,
        events: 600,
        mode: 'capped',
      },
      budgetMode: 'capped',
      generatedItinerary: {
        days: [
          {
            dayNumber: 1,
            title: 'Day 1 - Paris',
            timeSlots: [
              {
                period: 'morning',
                startTime: '09:00',
                endTime: '12:00',
                activities: [
                  {
                    name: 'Eiffel Tower',
                    description: 'Iconic tower',
                    category: 'attraction',
                    duration: '2-3h',
                    estimatedCost: '$30',
                    location: { lat: 48.8584, lng: 2.2945 },
                    rating: 4.7,
                  },
                ],
              },
              {
                period: 'afternoon',
                startTime: '14:00',
                endTime: '18:00',
                activities: [],
              },
              {
                period: 'evening',
                startTime: '19:00',
                endTime: '22:00',
                activities: [],
              },
            ],
          },
        ],
        tripMetadata: {
          destination: 'Paris',
          numberOfPeople: 2,
        },
      },
    };

    const trip = new Trip(tripData);
    const saved = await trip.save();
    const found = await Trip.findById(saved._id);

    expect(found).not.toBeNull();
    expect(found!.title).toBe('Paris Adventure');
    expect(found!.totalDays).toBe(5);
    expect(found!.cities[0].name).toBe('Paris');
    expect(found!.generatedItinerary.days[0].dayNumber).toBe(1);
    expect(found!.generatedItinerary.days[0].timeSlots[0].activities[0].name).toBe('Eiffel Tower');
    expect(found!.generatedItinerary.tripMetadata.destination).toBe('Paris');
  });

  it('enforces required fields', async () => {
    const tripData = {
      user: new mongoose.Types.ObjectId(),
      // Missing title, startDate, totalDays, people, travelType, budget, generatedItinerary
    };

    await expect(new Trip(tripData).save()).rejects.toThrow();
  });

  it('serializes to JSON and back correctly', async () => {
    const tripData = {
      user: new mongoose.Types.ObjectId(),
      title: 'Tokyo Trip',
      startDate: new Date('2024-09-01'),
      cities: [{ name: 'Tokyo', days: 3 }],
      totalDays: 3,
      people: 1,
      travelType: 'leisure',
      budget: { total: 2000, travel: 500, accommodation: 800, food: 400, events: 300, mode: 'flexible' },
      budgetMode: 'flexible',
      generatedItinerary: {
        days: [{ dayNumber: 1, title: 'Day 1', timeSlots: [] }],
        tripMetadata: { destination: 'Tokyo', numberOfPeople: 1 },
      },
    };

    const trip = await new Trip(tripData).save();
    const json = JSON.stringify(trip.toObject());
    const parsed = JSON.parse(json);

    expect(parsed.title).toBe('Tokyo Trip');
    expect(parsed.cities[0].name).toBe('Tokyo');
    expect(parsed.budget.mode).toBe('flexible');
  });
});
