import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import nock from 'nock';
import { resetProviders } from '../../../src/services/inventory';
import flightsRouter from '../../../src/routes/flights';
import hotelsRouter from '../../../src/routes/hotels';

const SERPAPI_BASE = 'https://serpapi.com';

const googleFlightsResponse = {
  search_metadata: { id: 'test-1', status: 'Success' },
  best_flights: [
    {
      flights: [
        {
          departure_airport: { name: 'JFK', id: 'JFK', time: '2026-10-01 18:00' },
          arrival_airport: { name: 'LHR', id: 'LHR', time: '2026-10-02 06:00' },
          airline: 'British Airways',
          flight_number: 'BA 112',
          duration: 420,
        },
      ],
      layovers: [],
      total_duration: 420,
      price: 450,
      type: 'one-way',
      booking_token: 'tok_123',
    },
  ],
  other_flights: [],
};

const googleHotelsResponse = {
  search_metadata: { id: 'test-2', status: 'Success' },
  properties: [
    {
      name: 'Park Hyatt Tokyo',
      type: 'hotel',
      gps_coordinates: { latitude: 35.6858, longitude: 139.6917 },
      rate_per_night: { lowest: '$320', extracted_lowest: 320 },
      total_rate: { lowest: '$1,280', extracted_lowest: 1280 },
      rating: 4.8,
      reviews: 1240,
      amenities: ['Free Wi-Fi', 'Spa'],
      free_cancellation: true,
      images: [],
      serpapi_property_details_link: 'https://serpapi.com/search?token=abc',
      nearby_places: [],
    },
  ],
};

const googleFlightsAutocompleteResponse = {
  search_metadata: { id: 'test-3', status: 'Success' },
  suggestions: [
    { name: 'Tokyo', type: 'City', iata_code: 'TYO', country: 'Japan' },
    { name: 'Tokyo Haneda', type: 'Airport', iata_code: 'HND', country: 'Japan' },
  ],
};

describe('Flights routes', () => {
  let app: express.Application;

  beforeEach(() => {
    process.env.SERPAPI_API_KEY = 'test-key';
    process.env.INVENTORY_PROVIDER = 'serpapi';
    nock.cleanAll();
    resetProviders();

    app = express();
    app.use(express.json());
    app.use('/api/flights', flightsRouter);
  });

  afterEach(() => {
    nock.cleanAll();
    delete process.env.SERPAPI_API_KEY;
    delete process.env.INVENTORY_PROVIDER;
  });

  describe('GET /api/flights/search', () => {
    it('returns 400 when missing required params', async () => {
      const res = await request(app).get('/api/flights/search');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required parameters');
    });

    it('returns normalized flight offers', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsResponse);

      const res = await request(app)
        .get('/api/flights/search')
        .query({
          origin: 'JFK',
          destination: 'LHR',
          departureDate: '2026-10-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.flights).toHaveLength(1);
      expect(res.body.flights[0].price).toBe(450);
      expect(res.body.flights[0].isBest).toBe(true);
      expect(res.body.flights[0].legs[0].airline).toBe('British Airways');
    });

    it('returns 500 on provider error', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, {
          search_metadata: { status: 'Error' },
          error: 'Invalid API key',
        });

      const res = await request(app)
        .get('/api/flights/search')
        .query({
          origin: 'JFK',
          destination: 'LHR',
          departureDate: '2026-10-01',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('SerpApi error');
    });
  });

  describe('GET /api/flights/best', () => {
    it('returns the best (first) flight offer', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsResponse);

      const res = await request(app)
        .get('/api/flights/best')
        .query({
          origin: 'JFK',
          destination: 'LHR',
          departureDate: '2026-10-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.flight.price).toBe(450);
      expect(res.body.flight.isBest).toBe(true);
    });

    it('returns 404 when no flights found', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, { search_metadata: { status: 'Success' } });

      const res = await request(app)
        .get('/api/flights/best')
        .query({
          origin: 'JFK',
          destination: 'LHR',
          departureDate: '2026-10-01',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('No flights found');
    });
  });

  describe('GET /api/flights/autocomplete', () => {
    it('returns airport suggestions', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsAutocompleteResponse);

      const res = await request(app)
        .get('/api/flights/autocomplete')
        .query({ term: 'tokyo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.suggestions).toHaveLength(2);
      expect(res.body.suggestions[0].code).toBe('TYO');
    });

    it('returns 400 when missing term param', async () => {
      const res = await request(app).get('/api/flights/autocomplete');
      expect(res.status).toBe(400);
    });
  });
});

describe('Hotels routes', () => {
  let app: express.Application;

  beforeEach(() => {
    process.env.SERPAPI_API_KEY = 'test-key';
    process.env.INVENTORY_PROVIDER = 'serpapi';
    nock.cleanAll();
    resetProviders();

    app = express();
    app.use(express.json());
    app.use('/api/hotels', hotelsRouter);
  });

  afterEach(() => {
    nock.cleanAll();
    delete process.env.SERPAPI_API_KEY;
    delete process.env.INVENTORY_PROVIDER;
  });

  describe('GET /api/hotels/search', () => {
    it('returns 400 when missing required params', async () => {
      const res = await request(app).get('/api/hotels/search');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required parameters');
    });

    it('returns normalized hotel offers', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleHotelsResponse);

      const res = await request(app)
        .get('/api/hotels/search')
        .query({
          destination: 'Tokyo',
          checkIn: '2026-10-01',
          checkOut: '2026-10-05',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hotels).toHaveLength(1);
      expect(res.body.hotels[0].name).toBe('Park Hyatt Tokyo');
      expect(res.body.hotels[0].ratePerNight).toBe(320);
      expect(res.body.hotels[0].rating).toBe(4.8);
    });

    it('returns 500 on provider error', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, {
          search_metadata: { status: 'Error' },
          error: 'Rate limit exceeded',
        });

      const res = await request(app)
        .get('/api/hotels/search')
        .query({
          destination: 'Tokyo',
          checkIn: '2026-10-01',
          checkOut: '2026-10-05',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('SerpApi error');
    });
  });
});
