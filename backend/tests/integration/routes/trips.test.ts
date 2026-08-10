import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

const validTripPayload = {
  title: 'Japan Trip 2026',
  description: 'Cherry blossom season',
  startDate: '2026-04-01',
  startLocation: 'New York',
  cities: [{ name: 'Tokyo', days: 5 }, { name: 'Kyoto', days: 3 }],
  totalDays: 8,
  people: 2,
  travelType: 'cultural',
  budget: { total: 5000, travel: 1500, accommodation: 1500, food: 1000, events: 1000, mode: 'capped' },
  budgetMode: 'capped',
  generatedItinerary: {
    days: [{ dayNumber: 1, title: 'Arrival in Tokyo', timeSlots: [] }],
    tripMetadata: { destination: 'Tokyo', numberOfPeople: 2 },
  },
};

describe('Trips routes', () => {
  let app: express.Application;
  let mongoServer: MongoMemoryServer;
  let testUserId: string;
  let authToken: string;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    process.env.JWT_SECRET = JWT_SECRET;

    const { User } = await import('../../../src/models/User');
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
    });
    testUserId = user._id.toString();
    authToken = jwt.sign({ sub: testUserId }, JWT_SECRET);

    const tripsRouter = (await import('../../../src/routes/trips')).default;
    app = express();
    app.use(express.json());
    app.use('/api/saved-trips', tripsRouter);
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/saved-trips', () => {
    it('creates a new saved trip', async () => {
      const res = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      expect(res.status).toBe(201);
      expect(res.body.savedTrip.title).toBe('Japan Trip 2026');
      expect(res.body.savedTrip.user).toBe(testUserId);
    });

    it('returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Incomplete' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/saved-trips')
        .send(validTripPayload);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/saved-trips', () => {
    it('returns paginated saved trips for the user', async () => {
      // Create a trip first
      await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const res = await request(app)
        .get('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.savedTrips).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/saved-trips');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/saved-trips/:id', () => {
    it('returns a specific trip', async () => {
      const createRes = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const tripId = createRes.body.savedTrip._id;
      const res = await request(app)
        .get(`/api/saved-trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(tripId);
    });

    it('returns 404 for non-existent trip', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/saved-trips/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/saved-trips/:id', () => {
    it('updates a trip', async () => {
      const createRes = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const tripId = createRes.body.savedTrip._id;
      const res = await request(app)
        .put(`/api/saved-trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Japan Trip' });

      expect(res.status).toBe(200);
      expect(res.body.savedTrip.title).toBe('Updated Japan Trip');
    });
  });

  describe('DELETE /api/saved-trips/:id', () => {
    it('deletes a trip', async () => {
      const createRes = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const tripId = createRes.body.savedTrip._id;
      const res = await request(app)
        .delete(`/api/saved-trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('GET /api/saved-trips/upcoming', () => {
    it('returns upcoming trips', async () => {
      const createRes = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const tripId = createRes.body.savedTrip._id;
      await request(app)
        .put(`/api/saved-trips/${tripId}/upcoming`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tripStartDate: '2026-04-01' });

      const res = await request(app)
        .get('/api/saved-trips/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upcomingTrips).toHaveLength(1);
    });
  });

  describe('GET /api/saved-trips/completed', () => {
    it('returns completed trips', async () => {
      const createRes = await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const tripId = createRes.body.savedTrip._id;
      await request(app)
        .put(`/api/saved-trips/${tripId}/completed`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/api/saved-trips/completed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.completedTrips).toHaveLength(1);
    });
  });

  describe('GET /api/saved-trips/statistics', () => {
    it('returns trip statistics', async () => {
      await request(app)
        .post('/api/saved-trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTripPayload);

      const res = await request(app)
        .get('/api/saved-trips/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.statistics.totalTrips).toBe(1);
      expect(res.body.statistics.savedTrips).toBe(1);
    });
  });
});
