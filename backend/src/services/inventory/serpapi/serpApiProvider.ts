import axios from 'axios';
import type {
  FlightProvider,
  HotelProvider,
  FlightQuery,
  FlightOffer,
  HotelQuery,
  HotelOffer,
  AirportRef,
} from '../types';

const SERPAPI_BASE = 'https://serpapi.com';

/**
 * SerpApi provider — implements FlightProvider + HotelProvider
 * using Google Flights and Google Hotels engines.
 */
export class SerpApiProvider implements FlightProvider, HotelProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // ─── FlightProvider ───

  async searchOffers(query: FlightQuery): Promise<FlightOffer[]> {
    const params: Record<string, string> = {
      engine: 'google_flights',
      api_key: this.apiKey,
      departure_id: query.origin,
      arrival_id: query.destination,
      outbound_date: query.departureDate,
      type: query.returnDate ? '2' : '1',
      adults: String(query.adults),
      children: String(query.children),
      travel_class: query.travelClass,
      currency: query.currency,
    };

    if (query.returnDate) {
      params.return_date = query.returnDate;
    }

    if (query.deepSearch) {
      params.deep_search = 'true';
    }

    if (query.maxPrice) {
      params.max_price = String(query.maxPrice);
    }

    const { data } = await axios.get(`${SERPAPI_BASE}/search`, { params });

    if (data.search_metadata?.status === 'Error') {
      throw new Error(`SerpApi error: ${data.error || 'Unknown error'}`);
    }

    const offers: FlightOffer[] = [];

    for (const flight of data.best_flights || []) {
      offers.push(this.normalizeFlightOffer(flight, true, query.currency));
    }

    for (const flight of data.other_flights || []) {
      offers.push(this.normalizeFlightOffer(flight, false, query.currency));
    }

    return offers;
  }

  async autocomplete(term: string): Promise<AirportRef[]> {
    const { data } = await axios.get(`${SERPAPI_BASE}/search`, {
      params: {
        engine: 'google_flights_autocomplete',
        api_key: this.apiKey,
        q: term,
      },
    });

    if (data.search_metadata?.status === 'Error') {
      throw new Error(`SerpApi error: ${data.error || 'Unknown error'}`);
    }

    return (data.suggestions || []).map((s: any) => ({
      code: s.iata_code,
      name: s.name,
      city: s.type === 'City' ? s.name : undefined,
    }));
  }

  // ─── HotelProvider ───

  async search(query: HotelQuery): Promise<HotelOffer[]> {
    const sortMap: Record<string, string> = {
      'relevance': '0',
      'price-low': '3',
      'rating-high': '8',
      'reviews': '13',
    };

    const params: Record<string, string> = {
      engine: 'google_hotels',
      api_key: this.apiKey,
      q: query.destination,
      check_in_date: query.checkIn,
      check_out_date: query.checkOut,
      adults: String(query.adults),
      children: String(query.children),
      currency: query.currency,
      sort: sortMap[query.sort] || '0',
    };

    if (query.minPrice) {
      params.min_price = String(query.minPrice);
    }

    if (query.maxPrice) {
      params.max_price = String(query.maxPrice);
    }

    const { data } = await axios.get(`${SERPAPI_BASE}/search`, { params });

    if (data.search_metadata?.status === 'Error') {
      throw new Error(`SerpApi error: ${data.error || 'Unknown error'}`);
    }

    return (data.properties || []).map((p: any) => this.normalizeHotelOffer(p, query.currency));
  }

  // ─── Private normalizers ───

  private normalizeFlightOffer(raw: any, isBest: boolean, currency: string): FlightOffer {
    const legs = (raw.flights || []).map((f: any) => ({
      departureAirport: {
        code: f.departure_airport?.id || '',
        name: f.departure_airport?.name || '',
        time: f.departure_airport?.time,
      },
      arrivalAirport: {
        code: f.arrival_airport?.id || '',
        name: f.arrival_airport?.name || '',
        time: f.arrival_airport?.time,
      },
      airline: f.airline || '',
      airlineLogo: f.airline_logo,
      flightNumber: f.flight_number || '',
      airplane: f.airplane,
      travelClass: f.travel_class,
      duration: f.duration || 0,
      legroom: f.legroom,
      overnight: f.overnight,
      extensions: f.extensions,
    }));

    const layovers = (raw.layovers || []).map((l: any) => ({
      airportCode: l.id || '',
      airportName: l.name,
      duration: l.duration || 0,
      overnight: l.overnight,
    }));

    const id = `flight_${raw.booking_token || Math.random().toString(36).slice(2)}`;

    return {
      id,
      legs,
      layovers,
      totalDuration: raw.total_duration || 0,
      price: raw.price || 0,
      currency,
      type: raw.type === 'round-trip' ? 'round-trip' : 'one-way',
      bookingToken: raw.booking_token,
      carbonEmissions: raw.carbon_emissions
        ? {
            thisFlight: raw.carbon_emissions.this_flight,
            typicalForRoute: raw.carbon_emissions.typical_for_this_route,
            differencePercent: raw.carbon_emissions.difference_percent,
          }
        : undefined,
      isBest,
    };
  }

  private normalizeHotelOffer(raw: any, currency: string): HotelOffer {
    const id = `hotel_${raw.property_token || Math.random().toString(36).slice(2)}`;

    return {
      id,
      name: raw.name || '',
      type: raw.type,
      ratePerNight: raw.rate_per_night?.extracted_lowest,
      totalRate: raw.total_rate?.extracted_lowest,
      currency,
      ratePerNightFormatted: raw.rate_per_night?.lowest,
      totalRateFormatted: raw.total_rate?.lowest,
      rating: raw.rating,
      reviewsCount: raw.reviews,
      gpsCoordinates: raw.gps_coordinates
        ? {
            latitude: raw.gps_coordinates.latitude,
            longitude: raw.gps_coordinates.longitude,
          }
        : undefined,
      checkInTime: raw.check_in_time,
      checkOutTime: raw.check_out_time,
      amenities: raw.amenities || [],
      freeCancellation: raw.free_cancellation,
      images: (raw.images || []).map((img: any) => ({
        thumbnail: img.thumbnail,
        original: img.original_image,
      })),
      bookingLink: raw.serpapi_property_details_link,
      nearbyPlaces: (raw.nearby_places || []).map((np: any) => ({
        name: np.name,
        transportations: np.transportations,
      })),
    };
  }
}
