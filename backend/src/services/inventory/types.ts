import { z } from 'zod';

// ─── Normalized flight types ───

export const AirportRefSchema = z.object({
  code: z.string(),            // IATA code (e.g. "JFK")
  name: z.string(),            // Airport name
  city: z.string().optional(),
  time: z.string().optional(), // ISO datetime for departure/arrival
});

export const FlightLegSchema = z.object({
  departureAirport: AirportRefSchema,
  arrivalAirport: AirportRefSchema,
  airline: z.string(),
  airlineLogo: z.string().optional(),
  flightNumber: z.string(),
  airplane: z.string().optional(),
  travelClass: z.string().optional(),
  duration: z.number(),         // minutes
  legroom: z.string().optional(),
  overnight: z.boolean().optional(),
  extensions: z.array(z.string()).optional(),
});

export const LayoverSchema = z.object({
  airportCode: z.string(),
  airportName: z.string().optional(),
  duration: z.number(),         // minutes
  overnight: z.boolean().optional(),
});

export const CarbonEmissionsSchema = z.object({
  thisFlight: z.number().optional(),    // grams
  typicalForRoute: z.number().optional(),
  differencePercent: z.number().optional(),
});

export const FlightOfferSchema = z.object({
  id: z.string(),
  legs: z.array(FlightLegSchema),
  layovers: z.array(LayoverSchema).default([]),
  totalDuration: z.number(),       // minutes
  price: z.number(),
  currency: z.string().default('USD'),
  priceFormatted: z.string().optional(),
  type: z.enum(['one-way', 'round-trip']).default('one-way'),
  bookingToken: z.string().optional(),
  bookingLink: z.string().optional(),
  carbonEmissions: CarbonEmissionsSchema.optional(),
  isBest: z.boolean().default(false),
});

export const FlightQuerySchema = z.object({
  origin: z.string(),              // IATA code
  destination: z.string(),         // IATA code
  departureDate: z.string(),       // YYYY-MM-DD
  returnDate: z.string().optional(),
  adults: z.number().default(1),
  children: z.number().default(0),
  travelClass: z.enum(['economy', 'business', 'first']).default('economy'),
  maxPrice: z.number().optional(),
  currency: z.string().default('USD'),
  deepSearch: z.boolean().default(false),
});

// ─── Normalized hotel types ───

export const HotelOfferSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),      // "hotel", "vacation rental", etc.
  ratePerNight: z.number().optional(),
  totalRate: z.number().optional(),
  currency: z.string().default('USD'),
  ratePerNightFormatted: z.string().optional(),
  totalRateFormatted: z.string().optional(),
  rating: z.number().optional(),
  reviewsCount: z.number().optional(),
  gpsCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  freeCancellation: z.boolean().optional(),
  images: z.array(z.object({
    thumbnail: z.string().optional(),
    original: z.string().optional(),
  })).default([]),
  bookingLink: z.string().optional(),
  nearbyPlaces: z.array(z.object({
    name: z.string(),
    transportations: z.array(z.object({
      type: z.string(),
      duration: z.string(),
    })).optional(),
  })).default([]),
});

export const HotelQuerySchema = z.object({
  destination: z.string(),         // City name or place ID
  checkIn: z.string(),             // YYYY-MM-DD
  checkOut: z.string(),            // YYYY-MM-DD
  adults: z.number().default(2),
  children: z.number().default(0),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  currency: z.string().default('USD'),
  sort: z.enum(['relevance', 'price-low', 'rating-high', 'reviews']).default('relevance'),
});

// ─── Provider interfaces ───

export interface FlightProvider {
  searchOffers(query: FlightQuery): Promise<FlightOffer[]>;
  autocomplete(term: string): Promise<AirportRef[]>;
}

export interface HotelProvider {
  search(query: HotelQuery): Promise<HotelOffer[]>;
}

// ─── Inferred types ───

export type AirportRef = z.infer<typeof AirportRefSchema>;
export type FlightLeg = z.infer<typeof FlightLegSchema>;
export type Layover = z.infer<typeof LayoverSchema>;
export type FlightOffer = z.infer<typeof FlightOfferSchema>;
export type FlightQuery = z.infer<typeof FlightQuerySchema>;
export type HotelOffer = z.infer<typeof HotelOfferSchema>;
export type HotelQuery = z.infer<typeof HotelQuerySchema>;
