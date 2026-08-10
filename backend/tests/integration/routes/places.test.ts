import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import nock from 'nock';
import placesRouter from '../../../src/routes/places';

const OPENTRIPMAP_BASE = 'https://api.opentripmap.com';
const GEODB_BASE = 'https://wft-geo-db.p.rapidapi.com';

describe('Places routes', () => {
  let app: express.Application;

  beforeEach(() => {
    process.env.OPENTRIPMAP_API_KEY = 'test-otm-key';
    process.env.GEODB_API_KEY = 'test-geodb-key';
    process.env.GEODB_HOST = 'wft-geo-db.p.rapidapi.com';
    nock.cleanAll();

    app = express();
    app.use(express.json());
    app.use('/api/places', placesRouter);
  });

  afterEach(() => {
    nock.cleanAll();
    delete process.env.OPENTRIPMAP_API_KEY;
    delete process.env.GEODB_API_KEY;
    delete process.env.GEODB_HOST;
  });

  describe('GET /api/places/search', () => {
    it('returns 400 when missing query param', async () => {
      const res = await request(app).get('/api/places/search');
      expect(res.status).toBe(400);
    });

    it('returns 400 when query is empty', async () => {
      const res = await request(app).get('/api/places/search?query=');
      expect(res.status).toBe(400);
    });

    it('returns places on valid query', async () => {
      nock(OPENTRIPMAP_BASE)
        .get('/0.1/en/places/geoname')
        .query(true)
        .reply(200, { lat: 35.6762, lon: 139.6503, name: 'Tokyo', country: 'Japan' });

      nock(OPENTRIPMAP_BASE)
        .get('/0.1/en/places/radius')
        .query(true)
        .reply(200, {
          features: [
            {
              properties: { xid: 'abc123', name: 'Tokyo Tower', kinds: 'historic,architecture', rate: 8 },
              geometry: { coordinates: [139.7454, 35.6586] },
            },
          ],
        });

      nock(OPENTRIPMAP_BASE)
        .get('/0.1/en/places/xid/abc123')
        .query(true)
        .reply(200, {
          preview: { source: 'https://example.com/tokyo-tower.jpg' },
          wikipedia_extracts: { text: 'A famous tower in Tokyo.' },
        });

      const res = await request(app).get('/api/places/search?query=Tokyo');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Tokyo Tower');
      expect(res.body[0].type).toBe('historic');
      expect(res.body[0].coordinates.lat).toBe(35.6586);
    });

    it('returns empty array when geocoding fails', async () => {
      nock(OPENTRIPMAP_BASE)
        .get('/0.1/en/places/geoname')
        .query(true)
        .reply(200, { lat: 0, lon: 0 });

      const res = await request(app).get('/api/places/search?query=NonexistentPlace');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/places/autocomplete', () => {
    it('returns 400 when missing query param', async () => {
      const res = await request(app).get('/api/places/autocomplete');
      expect(res.status).toBe(400);
    });

    it('returns autocomplete suggestions', async () => {
      nock(GEODB_BASE)
        .get('/v1/geo/cities')
        .query(true)
        .reply(200, {
          data: [
            {
              id: 1, name: 'Tokyo', country: 'Japan', region: 'Tokyo',
              latitude: 35.6762, longitude: 139.6503, population: 13960000,
            },
            {
              id: 2, name: 'Tokyo Station', country: 'Japan', region: 'Tokyo',
              latitude: 35.6812, longitude: 139.7671, population: 5000,
            },
          ],
        });

      const res = await request(app).get('/api/places/autocomplete?query=Tokyo');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Tokyo');
      expect(res.body[0].type).toBe('major_city');
      expect(res.body[1].name).toBe('Tokyo Station');
      expect(res.body[1].type).toBe('place');
    });

    it('returns empty array for short queries', async () => {
      const res = await request(app).get('/api/places/autocomplete?query=T');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
