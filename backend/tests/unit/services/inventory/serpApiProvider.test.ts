import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { SerpApiProvider } from '../../../../src/services/inventory/serpapi/serpApiProvider';
import {
  FlightOfferSchema,
  HotelOfferSchema,
  AirportRefSchema,
} from '../../../../src/services/inventory/types';

const SERPAPI_BASE = 'https://serpapi.com';
const API_KEY = 'test-key-123';

// ─── Fixtures (recorded SerpApi response shapes) ───

const googleFlightsResponse = {
  search_metadata: { id: 'test-1', status: 'Success' },
  search_parameters: {
    engine: 'google_flights',
    departure_id: 'JFK',
    arrival_id: 'LHR',
    outbound_date: '2026-10-01',
    type: '1',
  },
  best_flights: [
    {
      flights: [
        {
          departure_airport: { name: 'John F Kennedy Intl', id: 'JFK', time: '2026-10-01 18:00' },
          arrival_airport: { name: 'Heathrow', id: 'LHR', time: '2026-10-02 06:00' },
          airline: 'British Airways',
          airline_logo: 'https://example.com/ba.png',
          flight_number: 'BA 112',
          airplane: 'Boeing 777',
          travel_class: 'Economy',
          duration: 420,
          legroom: '31 in',
          overnight: true,
          extensions: ['Average legroom', 'In-seat power'],
        },
      ],
      layovers: [],
      total_duration: 420,
      price: 450,
      type: 'one-way',
      booking_token: 'tok_123',
      carbon_emissions: {
        this_flight: 83600,
        typical_for_this_route: 90000,
        difference_percent: -7,
      },
    },
  ],
  other_flights: [
    {
      flights: [
        {
          departure_airport: { name: 'John F Kennedy Intl', id: 'JFK', time: '2026-10-01 10:00' },
          arrival_airport: { name: 'Heathrow', id: 'LHR', time: '2026-10-02 22:30' },
          airline: 'Virgin Atlantic',
          flight_number: 'VS 4',
          airplane: 'Airbus A350',
          travel_class: 'Economy',
          duration: 510,
        },
      ],
      layovers: [
        { name: 'Dublin Intl', id: 'DUB', duration: 120, overnight: false },
      ],
      total_duration: 630,
      price: 380,
      type: 'one-way',
      booking_token: 'tok_456',
    },
  ],
};

const googleHotelsResponse = {
  search_metadata: { id: 'test-2', status: 'Success' },
  search_parameters: {
    engine: 'google_hotels',
    q: 'Tokyo Hotels',
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-05',
  },
  properties: [
    {
      name: 'Park Hyatt Tokyo',
      type: 'hotel',
      gps_coordinates: { latitude: 35.6858, longitude: 139.6917 },
      check_in_time: '3:00 PM',
      check_out_time: '12:00 PM',
      rate_per_night: { lowest: '$320', extracted_lowest: 320 },
      total_rate: { lowest: '$1,280', extracted_lowest: 1280 },
      rating: 4.8,
      reviews: 1240,
      amenities: ['Free Wi-Fi', 'Spa', 'Gym', 'Restaurant'],
      free_cancellation: true,
      images: [
        { thumbnail: 'https://example.com/thumb.jpg', original_image: 'https://example.com/full.jpg' },
      ],
      serpapi_property_details_link: 'https://serpapi.com/search?engine=google_hotels&property_token=abc',
      nearby_places: [
        { name: 'Shibuya Station', transportations: [{ type: 'Walking', duration: '15 min' }] },
      ],
    },
  ],
};

const googleFlightsAutocompleteResponse = {
  search_metadata: { id: 'test-3', status: 'Success' },
  search_parameters: { engine: 'google_flights_autocomplete', q: 'tokyo' },
  suggestions: [
    { name: 'Tokyo', type: 'City', iata_code: 'TYO', country: 'Japan' },
    { name: 'Tokyo Haneda', type: 'Airport', iata_code: 'HND', country: 'Japan' },
  ],
};

describe('SerpApiProvider', () => {
  let provider: SerpApiProvider;

  beforeEach(() => {
    provider = new SerpApiProvider(API_KEY);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ─── Flight search ───

  describe('searchOffers', () => {
    it('returns normalized FlightOffer[] from SerpApi google_flights response', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsResponse);

      const offers = await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        adults: 1,
        children: 0,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      expect(offers).toHaveLength(2);
      expect(offers[0].isBest).toBe(true);
      expect(offers[0].price).toBe(450);
      expect(offers[0].legs[0].airline).toBe('British Airways');
      expect(offers[0].legs[0].departureAirport.code).toBe('JFK');
      expect(offers[0].totalDuration).toBe(420);
      expect(offers[0].bookingToken).toBe('tok_123');
      expect(offers[0].carbonEmissions?.thisFlight).toBe(83600);
    });

    it('marks best_flights as isBest=true and other_flights as isBest=false', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsResponse);

      const offers = await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        adults: 1,
        children: 0,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      expect(offers[0].isBest).toBe(true);
      expect(offers[1].isBest).toBe(false);
    });

    it('parses layovers correctly', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsResponse);

      const offers = await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        adults: 1,
        children: 0,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      expect(offers[1].layovers).toHaveLength(1);
      expect(offers[1].layovers[0].airportCode).toBe('DUB');
      expect(offers[1].layovers[0].duration).toBe(120);
    });

    it('validates each offer against the zod schema', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsResponse);

      const offers = await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        adults: 1,
        children: 0,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      for (const offer of offers) {
        const result = FlightOfferSchema.safeParse(offer);
        expect(result.success).toBe(true);
      }
    });

    it('returns empty array when no flights found', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, { search_metadata: { status: 'Success' } });

      const offers = await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        adults: 1,
        children: 0,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      expect(offers).toEqual([]);
    });

    it('throws on SerpApi error status', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, {
          search_metadata: { status: 'Error' },
          error: 'Invalid API key',
        });

      await expect(
        provider.searchOffers({
          origin: 'JFK',
          destination: 'LHR',
          departureDate: '2026-10-01',
          adults: 1,
          children: 0,
          travelClass: 'economy',
          currency: 'USD',
          deepSearch: false,
        })
      ).rejects.toThrow('SerpApi error: Invalid API key');
    });

    it('sends correct query parameters to SerpApi', async () => {
      const scope = nock(SERPAPI_BASE)
        .get('/search')
        .query({
          engine: 'google_flights',
          api_key: API_KEY,
          departure_id: 'JFK',
          arrival_id: 'LHR',
          outbound_date: '2026-10-01',
          type: '1',
          adults: '2',
          children: '1',
          travel_class: 'economy',
          currency: 'USD',
        })
        .reply(200, googleFlightsResponse);

      await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        adults: 2,
        children: 1,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('sends round-trip type when returnDate is provided', async () => {
      const scope = nock(SERPAPI_BASE)
        .get('/search')
        .query(q => q.type === '2' && q.return_date === '2026-10-10')
        .reply(200, googleFlightsResponse);

      await provider.searchOffers({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-10-01',
        returnDate: '2026-10-10',
        adults: 1,
        children: 0,
        travelClass: 'economy',
        currency: 'USD',
        deepSearch: false,
      });

      expect(scope.isDone()).toBe(true);
    });
  });

  // ─── Hotel search ───

  describe('search (hotels)', () => {
    it('returns normalized HotelOffer[] from SerpApi google_hotels response', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleHotelsResponse);

      const offers = await provider.search({
        destination: 'Tokyo',
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        adults: 2,
        children: 0,
        currency: 'USD',
        sort: 'relevance',
      });

      expect(offers).toHaveLength(1);
      expect(offers[0].name).toBe('Park Hyatt Tokyo');
      expect(offers[0].ratePerNight).toBe(320);
      expect(offers[0].totalRate).toBe(1280);
      expect(offers[0].rating).toBe(4.8);
      expect(offers[0].amenities).toContain('Spa');
      expect(offers[0].gpsCoordinates?.latitude).toBe(35.6858);
      expect(offers[0].freeCancellation).toBe(true);
    });

    it('validates each offer against the zod schema', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleHotelsResponse);

      const offers = await provider.search({
        destination: 'Tokyo',
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        adults: 2,
        children: 0,
        currency: 'USD',
        sort: 'relevance',
      });

      for (const offer of offers) {
        const result = HotelOfferSchema.safeParse(offer);
        expect(result.success).toBe(true);
      }
    });

    it('handles empty properties array', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, { search_metadata: { status: 'Success' }, properties: [] });

      const offers = await provider.search({
        destination: 'Tokyo',
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        adults: 2,
        children: 0,
        currency: 'USD',
        sort: 'relevance',
      });

      expect(offers).toEqual([]);
    });
  });

  // ─── Autocomplete ───

  describe('autocomplete', () => {
    it('returns normalized AirportRef[] from google_flights_autocomplete', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsAutocompleteResponse);

      const results = await provider.autocomplete('tokyo');

      expect(results).toHaveLength(2);
      expect(results[0].code).toBe('TYO');
      expect(results[0].name).toBe('Tokyo');
      expect(results[1].code).toBe('HND');
    });

    it('validates each result against zod schema', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, googleFlightsAutocompleteResponse);

      const results = await provider.autocomplete('tokyo');

      for (const ref of results) {
        const result = AirportRefSchema.safeParse(ref);
        expect(result.success).toBe(true);
      }
    });

    it('returns empty array on no suggestions', async () => {
      nock(SERPAPI_BASE)
        .get('/search')
        .query(true)
        .reply(200, { search_metadata: { status: 'Success' }, suggestions: [] });

      const results = await provider.autocomplete('xyznonexistent');
      expect(results).toEqual([]);
    });
  });
});
