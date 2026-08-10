import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

describe('Calendar routes', () => {
  let app: express.Application;
  let mongoServer: MongoMemoryServer;
  let testUserId: string;
  let authToken: string;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/google/oauth/callback';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    // Create a test user
    const { User } = await import('../../../src/models/User');
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
    });
    testUserId = user._id.toString();
    authToken = jwt.sign({ sub: testUserId }, JWT_SECRET);

    // Mock calendarService to avoid real Google API calls
    vi.doMock('../../../src/services/calendar/calendarService', () => ({
      calendarService: {
        getOAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/auth?scope=calendar'),
        exchangeCodeAndStoreTokens: vi.fn(async () => {}),
        listUpcomingEvents: vi.fn(async (userId: string) => {
          if (userId === testUserId) {
            return [{ id: 'evt1', summary: 'Test Event', start: { dateTime: '2026-10-01T10:00:00Z' } }];
          }
          return [];
        }),
        createEvent: vi.fn(async (_userId: string, event: any) => ({
          id: 'evt_new',
          summary: event.summary,
          start: { dateTime: event.start },
          end: { dateTime: event.end },
        })),
      },
    }));

    const calendarRouter = (await import('../../../src/routes/calendar')).default;
    app = express();
    app.use(express.json());
    app.use('/api/google', calendarRouter);
  });

  afterEach(async () => {
    vi.doUnmock('../../../src/services/calendar/calendarService');
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.JWT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  describe('GET /api/google/oauth/url', () => {
    it('returns OAuth URL when authenticated', async () => {
      const res = await request(app)
        .get('/api/google/oauth/url')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.url).toContain('accounts.google.com');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/google/oauth/url');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/google/oauth/callback', () => {
    it('returns 400 when missing code', async () => {
      const res = await request(app).get('/api/google/oauth/callback?state=some_state');
      expect(res.status).toBe(400);
    });

    it('returns 400 when missing state', async () => {
      const res = await request(app).get('/api/google/oauth/callback?code=some_code');
      expect(res.status).toBe(400);
    });

    it('redirects to frontend on success', async () => {
      const state = jwt.sign({ sub: testUserId }, JWT_SECRET);
      const res = await request(app)
        .get(`/api/google/oauth/callback?code=test_code&state=${state}`)
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/trips?gcal=connected');
    });

    it('returns 401 on invalid state token', async () => {
      const res = await request(app)
        .get('/api/google/oauth/callback?code=test_code&state=invalid_token')
        .redirects(0);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/google/calendar/upcoming', () => {
    it('returns upcoming events when authenticated', async () => {
      const res = await request(app)
        .get('/api/google/calendar/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(1);
      expect(res.body.events[0].summary).toBe('Test Event');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/google/calendar/upcoming');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/google/calendar/events', () => {
    it('creates an event when valid data provided', async () => {
      const res = await request(app)
        .post('/api/google/calendar/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          summary: 'Flight to Tokyo',
          start: '2026-10-01T10:00:00Z',
          end: '2026-10-01T14:00:00Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.event.summary).toBe('Flight to Tokyo');
    });

    it('returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/google/calendar/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ summary: 'Missing dates' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/google/calendar/events')
        .send({ summary: 'test', start: '2026-10-01', end: '2026-10-02' });

      expect(res.status).toBe(401);
    });
  });
});
