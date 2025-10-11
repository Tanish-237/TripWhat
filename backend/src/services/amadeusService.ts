import Amadeus from "amadeus";

/**
 * Amadeus Travel API Service
 *
 * This service provides flight search and travel-related functionality using the Amadeus API.
 *
 * Key improvements:
 * - Enhanced error handling with specific Amadeus API error responses
 * - Proper parameter validation (IATA codes, date formatting)
 * - Comprehensive logging for debugging
 * - Connection testing functionality
 * - Support for all flight search parameters according to API spec
 * - Flight Inspiration Search API for destination suggestions
 * - Travel inspiration with budget and duration filtering
 *
 * API References:
 * - Flight Offers Search: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search/api-reference
 * - Flight Inspiration Search: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-inspiration-search/api-reference
 */

// Types for Amadeus API responses
export interface FlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  paymentCardRequired: boolean;
  lastTicketingDate: string;
  itineraries: Itinerary[];
  price: Price;
  pricingOptions?: PricingOptions;
  validatingAirlineCodes: string[];
  travelerPricings: TravelerPricing[];
}

export interface Itinerary {
  segments: Segment[];
  duration: string;
}

export interface Segment {
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
  departure: LocationTime;
  arrival: LocationTime;
  carrierCode: string;
  number: string;
  aircraft: Aircraft;
  operating?: Operating;
  duration: string;
}

export interface LocationTime {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface Aircraft {
  code: string;
}

export interface Operating {
  carrierCode: string;
}

export interface Price {
  currency: string;
  total: string;
  base: string;
  fees: Fee[];
  grandTotal: string;
}

export interface Fee {
  amount: string;
  type: string;
}

export interface PricingOptions {
  fareType: string[];
  includedCheckedBagsOnly: boolean;
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: string;
  price: Price;
  fareDetailsBySegment: FareDetailsBySegment[];
}

export interface FareDetailsBySegment {
  segmentId: string;
  cabin: string;
  fareBasis: string;
  brandedFare?: string;
  class: string;
  includedCheckedBags: IncludedCheckedBags;
}

export interface IncludedCheckedBags {
  quantity: number;
}

export interface FlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  nonStop?: boolean;
  max?: number;
  currencyCode?: string;
}

export interface FlightInspirationParams {
  origin: string; // IATA code of the origin city
  departureDate?: string; // Date or range (e.g., "2024-12-25" or "2024-12-01,2025-01-31")
  oneWay?: boolean; // Default: false (round-trip)
  duration?: string; // Duration in days or range (e.g., "7" or "5,10")
  nonStop?: boolean; // Default: false
  maxPrice?: number; // Maximum price limit
  viewBy?: "COUNTRY" | "DATE" | "DESTINATION" | "DURATION" | "WEEK"; // Default: DESTINATION
}

export interface FlightDestination {
  type: "flight-destination";
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: {
    total: string;
  };
  links: {
    flightDates: string;
    flightOffers: string;
  };
}

export interface FlightInspirationResponse {
  data: FlightDestination[];
  dictionaries: {
    currencies: Record<string, string>;
    locations: Record<
      string,
      {
        subType: "AIRPORT" | "CITY";
        detailedName: string;
      }
    >;
  };
  meta: {
    currency: string;
    links: {
      self: string;
    };
    defaults: {
      departureDate: string;
      oneWay: boolean;
      duration: string;
      nonStop: boolean;
      viewBy: string;
    };
  };
}

export interface AirportInfo {
  iataCode: string;
  name: string;
  cityName: string;
  countryName: string;
  latitude: number;
  longitude: number;
}

export interface TravelRoute {
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  travelMode: "FLIGHT" | "GROUND" | "MIXED";
  flights?: FlightOffer[];
  estimatedTravelTime: string;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
}

class AmadeusService {
  private amadeus: Amadeus;

  constructor() {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error(
        "❌ Missing Amadeus API credentials in environment variables"
      );
      console.error("Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET");
    }

    this.amadeus = new Amadeus({
      clientId: clientId || "",
      clientSecret: clientSecret || "",
      hostname: process.env.NODE_ENV === "production" ? "production" : "test",
      logLevel: process.env.NODE_ENV === "development" ? "debug" : "silent",
    });

    console.log(
      `🔧 Amadeus service initialized for ${
        process.env.NODE_ENV === "production" ? "production" : "test"
      } environment`
    );
  }

  /**
   * Test API connectivity and credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log("🔍 Testing Amadeus API connection...");

      // Try a simple API call to test credentials
      const response = await this.amadeus.referenceData.locations.get({
        keyword: "NYC",
        subType: "CITY",
        page: { limit: 1 },
      });

      if (response.data) {
        console.log("✅ Amadeus API connection successful");
        return true;
      }

      console.log("⚠️ Amadeus API connection test returned no data");
      return false;
    } catch (error: any) {
      console.error("❌ Amadeus API connection test failed:", error);

      if (error.response?.statusCode === 401) {
        console.error(
          "❌ Authentication failed - please check your Amadeus API credentials"
        );
      }

      return false;
    }
  }

  /**
   * Search for flight inspiration destinations from an origin
   * This API finds the cheapest destinations you can fly to from a given origin
   */
  async searchFlightInspiration(
    params: FlightInspirationParams
  ): Promise<FlightInspirationResponse> {
    try {
      console.log(`✨ Searching flight inspiration from ${params.origin}`);

      // Validate origin IATA code
      if (!this.isValidIATACode(params.origin)) {
        throw new Error(`Invalid origin IATA code: ${params.origin}`);
      }

      // Build search parameters according to Amadeus API requirements
      const searchParams: any = {
        origin: params.origin.toUpperCase(),
      };

      // Add optional parameters only if provided
      if (params.departureDate) {
        // Handle both single dates and date ranges
        if (params.departureDate.includes(",")) {
          // Date range - validate both dates
          const [startDate, endDate] = params.departureDate.split(",");
          searchParams.departureDate = `${this.formatDateForAPI(
            startDate
          )},${this.formatDateForAPI(endDate)}`;
        } else {
          // Single date
          searchParams.departureDate = this.formatDateForAPI(
            params.departureDate
          );
        }
      }

      if (params.oneWay !== undefined) {
        searchParams.oneWay = params.oneWay;
      }

      if (params.duration) {
        // Duration can be single number or range (e.g., "7" or "5,10")
        searchParams.duration = params.duration;
      }

      if (params.nonStop !== undefined) {
        searchParams.nonStop = params.nonStop;
      }

      if (params.maxPrice && params.maxPrice > 0) {
        searchParams.maxPrice = Math.floor(params.maxPrice); // Must be integer without decimals
      }

      if (params.viewBy) {
        searchParams.viewBy = params.viewBy;
      }

      console.log("🔍 Amadeus flight inspiration parameters:", searchParams);

      const response = await this.amadeus.shopping.flightDestinations.get(
        searchParams
      );

      console.log(
        `✅ Flight inspiration response status: ${response.result?.status}`
      );
      console.log(
        `✅ Found ${response.data?.length || 0} destination inspirations`
      );

      return {
        data: response.data || [],
        dictionaries: response.result?.dictionaries || {
          currencies: {},
          locations: {},
        },
        meta: response.result?.meta || {
          currency: "USD",
          links: { self: "" },
          defaults: {
            departureDate: "",
            oneWay: false,
            duration: "1,15",
            nonStop: false,
            viewBy: "DESTINATION",
          },
        },
      };
    } catch (error: any) {
      console.error("❌ Error searching flight inspiration:", error);

      // Handle specific Amadeus API errors
      if (error.response) {
        console.error("❌ Amadeus API Error:", error.response.body);
        console.error("❌ Status Code:", error.response.statusCode);

        // Handle specific error cases based on documentation
        if (error.response.statusCode === 400) {
          const errorDetail = error.response.body?.errors?.[0];
          if (errorDetail?.code === 425) {
            throw new Error(
              "Invalid date format. Please use YYYY-MM-DD format."
            );
          } else if (errorDetail?.code === 477) {
            throw new Error(`Invalid parameter format: ${errorDetail.detail}`);
          } else if (errorDetail?.code === 2668) {
            throw new Error("Invalid parameter combination.");
          } else if (errorDetail?.code === 32171) {
            throw new Error("Missing required parameters.");
          }
          throw new Error(
            `Invalid flight inspiration parameters: ${
              errorDetail?.detail || "Bad request"
            }`
          );
        } else if (error.response.statusCode === 401) {
          throw new Error(
            "Authentication failed. Please check Amadeus API credentials."
          );
        } else if (error.response.statusCode === 404) {
          throw new Error(
            "No flight destinations found for the given parameters."
          );
        } else if (error.response.statusCode === 500) {
          throw new Error("Amadeus API server error. Please try again later.");
        }
      }

      throw new Error(
        `Flight inspiration search failed: ${error.message || error}`
      );
    }
  }

  /**
   * Search for flights between two locations
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    try {
      console.log(
        `🛫 Searching flights from ${params.originLocationCode} to ${params.destinationLocationCode}`
      );

      // Validate IATA codes
      if (!this.isValidIATACode(params.originLocationCode)) {
        throw new Error(
          `Invalid origin IATA code: ${params.originLocationCode}`
        );
      }
      if (!this.isValidIATACode(params.destinationLocationCode)) {
        throw new Error(
          `Invalid destination IATA code: ${params.destinationLocationCode}`
        );
      }

      // Build search parameters according to Amadeus API requirements
      const searchParams: any = {
        originLocationCode: params.originLocationCode.toUpperCase(),
        destinationLocationCode: params.destinationLocationCode.toUpperCase(),
        departureDate: this.formatDateForAPI(params.departureDate),
        adults: params.adults,
        max: params.max || 20,
      };

      // Add optional parameters only if provided
      if (params.returnDate) {
        searchParams.returnDate = this.formatDateForAPI(params.returnDate);
      }

      if (params.children && params.children > 0) {
        searchParams.children = params.children;
      }

      if (params.infants && params.infants > 0) {
        searchParams.infants = params.infants;
      }

      if (params.travelClass) {
        searchParams.travelClass = params.travelClass;
      }

      if (params.nonStop !== undefined) {
        searchParams.nonStop = params.nonStop;
      }

      if (params.currencyCode) {
        searchParams.currencyCode = params.currencyCode;
      }

      console.log("🔍 Amadeus search parameters:", searchParams);

      const response = await this.amadeus.shopping.flightOffersSearch.get(
        searchParams
      );

      console.log(
        `✅ Flight search response status: ${response.result?.status}`
      );
      console.log(`✅ Found ${response.data?.length || 0} flight offers`);

      return response.data || [];
    } catch (error: any) {
      console.error("❌ Error searching flights:", error);

      // Handle specific Amadeus API errors
      if (error.response) {
        console.error("❌ Amadeus API Error:", error.response.body);
        console.error("❌ Status Code:", error.response.statusCode);

        // Handle specific error cases
        if (error.response.statusCode === 400) {
          throw new Error(
            `Invalid flight search parameters: ${
              error.response.body?.errors?.[0]?.detail || "Bad request"
            }`
          );
        } else if (error.response.statusCode === 401) {
          throw new Error(
            "Authentication failed. Please check Amadeus API credentials."
          );
        } else if (error.response.statusCode === 500) {
          throw new Error("Amadeus API server error. Please try again later.");
        }
      }

      throw new Error(`Flight search failed: ${error.message || error}`);
    }
  }

  /**
   * Get airport information by IATA code
   */
  async getAirportInfo(iataCode: string): Promise<AirportInfo | null> {
    try {
      console.log(`🏢 Getting airport info for IATA code: ${iataCode}`);

      const response = await this.amadeus.referenceData.locations.get({
        keyword: iataCode,
        subType: "AIRPORT",
        page: {
          limit: 1,
        },
      });

      if (response.data && response.data.length > 0) {
        const airport = response.data[0];

        // Validate that we got the correct airport
        if (
          airport.iataCode &&
          airport.iataCode.toUpperCase() === iataCode.toUpperCase()
        ) {
          const airportInfo = {
            iataCode: airport.iataCode,
            name: airport.name || `Airport ${airport.iataCode}`,
            cityName: airport.address?.cityName || "",
            countryName: airport.address?.countryName || "",
            latitude: airport.geoCode?.latitude || 0,
            longitude: airport.geoCode?.longitude || 0,
          };

          console.log(
            `✅ Found airport info for ${iataCode}:`,
            airportInfo.name
          );
          return airportInfo;
        }
      }

      console.log(`⚠️ No airport found for IATA code: ${iataCode}`);
      return null;
    } catch (error: any) {
      console.error(`❌ Error getting airport info for ${iataCode}:`, error);

      if (error.response) {
        console.error("❌ Amadeus API Error:", error.response.body);
        console.error("❌ Status Code:", error.response.statusCode);
      }

      return null;
    }
  }

  /**
   * Search for airports near a city
   */
  /**
   * Extract city name from full address for Amadeus API
   * Amadeus expects short keywords like "Paris" not "Paris, France"
   */
  private extractCityKeyword(fullLocation: string): string {
    // Common city name mappings that work well with Amadeus
    const cityMappings: { [key: string]: string } = {
      mumbai: "Mumbai",
      bombay: "Mumbai",
      "new delhi": "Delhi",
      delhi: "Delhi",
      bangalore: "Bangalore",
      bengaluru: "Bangalore",
      kolkata: "Kolkata",
      calcutta: "Kolkata",
      chennai: "Chennai",
      madras: "Chennai",
      hyderabad: "Hyderabad",
      pune: "Pune",
      ahmedabad: "Ahmedabad",
      paris: "Paris",
      london: "London",
      "new york": "New York",
      "los angeles": "Los Angeles",
      tokyo: "Tokyo",
      dubai: "Dubai",
      singapore: "Singapore",
      "hong kong": "Hong Kong",
      sydney: "Sydney",
      melbourne: "Melbourne",
    };

    // Remove common suffixes and get the main city name
    let cleanLocation = fullLocation
      .replace(
        /,\s*(India|France|USA|United States|UK|United Kingdom|Germany|Italy|Spain|Japan|Australia|Canada|Brazil|China|UAE|Singapore|Malaysia|Thailand).*$/i,
        ""
      )
      .replace(/,\s*[A-Z]{2,}.*$/i, "") // Remove state/region suffixes
      .trim();

    // If it's still too long, take just the first part
    const parts = cleanLocation.split(",");
    cleanLocation = parts[0].trim();

    // Check if we have a specific mapping for this city
    const lowerCity = cleanLocation.toLowerCase();
    if (cityMappings[lowerCity]) {
      return cityMappings[lowerCity];
    }

    // Return the cleaned city name
    return cleanLocation;
  }

  async searchAirports(cityName: string): Promise<AirportInfo[]> {
    try {
      const keyword = this.extractCityKeyword(cityName);
      console.log(
        `🏢 Searching airports for city: ${cityName} (using keyword: "${keyword}")`
      );

      const response = await this.amadeus.referenceData.locations.get({
        keyword: keyword,
        subType: "AIRPORT,CITY",
        page: {
          limit: 10,
        },
      });

      const airports: AirportInfo[] = [];
      if (response.data && Array.isArray(response.data)) {
        for (const location of response.data) {
          if (location.subType === "AIRPORT" && location.iataCode) {
            airports.push({
              iataCode: location.iataCode,
              name: location.name || `Airport ${location.iataCode}`,
              cityName: location.address?.cityName || cityName,
              countryName: location.address?.countryName || "",
              latitude: location.geoCode?.latitude || 0,
              longitude: location.geoCode?.longitude || 0,
            });
          }
        }
      }

      console.log(`✅ Found ${airports.length} airports for ${cityName}`);
      return airports;
    } catch (error: any) {
      console.error(`❌ Error searching airports for ${cityName}:`, error);

      if (error.response) {
        console.error("❌ Amadeus API Error:", error.response.body);
        console.error("❌ Status Code:", error.response.statusCode);
      }

      return [];
    }
  }

  /**
   * Get travel inspiration suggestions from a starting location
   * This method provides affordable destination suggestions for trip planning
   */
  async getTravelInspiration(
    originCity: string,
    departureMonth?: string, // Format: "2024-12" for December 2024
    maxBudget?: number,
    tripDuration?: number, // Days
    preferDirectFlights?: boolean
  ): Promise<{
    suggestions: Array<{
      destination: string;
      destinationName: string;
      price: number;
      currency: string;
      departureDate: string;
      returnDate?: string;
      isDirectFlight?: boolean;
    }>;
    totalFound: number;
  }> {
    try {
      console.log(`🌟 Getting travel inspiration from ${originCity}`);

      // Find airports for the origin city
      const originAirports = await this.searchAirports(originCity);
      if (originAirports.length === 0) {
        throw new Error(`No airports found for ${originCity}`);
      }

      const originCode = originAirports[0].iataCode;

      // Build inspiration search parameters
      const inspirationParams: FlightInspirationParams = {
        origin: originCode,
        nonStop: preferDirectFlights || false,
        viewBy: "DESTINATION",
      };

      // Add date range if departure month is specified
      if (departureMonth) {
        const year = departureMonth.split("-")[0];
        const month = departureMonth.split("-")[1];
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-28`; // Use 28 to avoid month-end issues
        inspirationParams.departureDate = `${startDate},${endDate}`;
      }

      // Add duration if specified
      if (tripDuration) {
        const minDuration = Math.max(1, tripDuration - 2);
        const maxDuration = Math.min(15, tripDuration + 2);
        inspirationParams.duration = `${minDuration},${maxDuration}`;
      }

      // Add max price if specified
      if (maxBudget) {
        inspirationParams.maxPrice = maxBudget;
      }

      const inspirationResponse = await this.searchFlightInspiration(
        inspirationParams
      );

      // Process and format the results
      const suggestions = inspirationResponse.data
        .slice(0, 20) // Limit to top 20 suggestions
        .map((destination) => ({
          destination: destination.destination,
          destinationName:
            inspirationResponse.dictionaries.locations[destination.destination]
              ?.detailedName || destination.destination,
          price: parseFloat(destination.price.total),
          currency: inspirationResponse.meta.currency,
          departureDate: destination.departureDate,
          returnDate: destination.returnDate,
          isDirectFlight: preferDirectFlights || false,
        }))
        .sort((a, b) => a.price - b.price); // Sort by price ascending

      console.log(
        `✅ Found ${suggestions.length} travel inspirations from ${originCity}`
      );

      return {
        suggestions,
        totalFound: inspirationResponse.data.length,
      };
    } catch (error) {
      console.error(
        `❌ Error getting travel inspiration from ${originCity}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get affordable destination suggestions for budget-conscious travelers
   * This is a simplified wrapper around flight inspiration for the trip planner
   */
  async getAffordableDestinations(
    originCity: string,
    maxBudget: number,
    departureMonth: string,
    limit: number = 10
  ): Promise<
    Array<{
      city: string;
      country: string;
      price: number;
      currency: string;
      departureDate: string;
      returnDate?: string;
    }>
  > {
    try {
      const inspiration = await this.getTravelInspiration(
        originCity,
        departureMonth,
        maxBudget,
        7, // Default to 7-day trips
        false // Allow connecting flights for better prices
      );

      return inspiration.suggestions.slice(0, limit).map((suggestion) => {
        const locationInfo = this.parseLocationInfo(suggestion.destinationName);
        return {
          city: locationInfo.city,
          country: locationInfo.country,
          price: suggestion.price,
          currency: suggestion.currency,
          departureDate: suggestion.departureDate,
          returnDate: suggestion.returnDate,
        };
      });
    } catch (error) {
      console.error(
        `❌ Error getting affordable destinations from ${originCity}:`,
        error
      );
      return [];
    }
  }

  /**
   * Parse location information from Amadeus location names
   */
  private parseLocationInfo(locationName: string): {
    city: string;
    country: string;
  } {
    // This is a simplified parser - in production you might want more sophisticated parsing
    const parts = locationName.split(" ");
    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts.slice(1).join(" "),
      };
    }
    return {
      city: locationName,
      country: "Unknown",
    };
  }

  /**
   * Calculate travel route between multiple cities
   */
  async calculateTravelRoutes(
    startLocation: string,
    cities: string[],
    startDate: Date,
    totalDays: number,
    passengers: number = 1
  ): Promise<TravelRoute[]> {
    const routes: TravelRoute[] = [];

    try {
      // Get airports for all locations
      const allLocations = [startLocation, ...cities, startLocation]; // Return to start
      const locationAirports = new Map<string, AirportInfo[]>();

      for (const location of [...new Set(allLocations)]) {
        const airports = await this.searchAirports(location);
        locationAirports.set(location, airports);
      }

      // Calculate days per city
      const daysPerCity = Math.floor(totalDays / cities.length);
      let currentDate = new Date(startDate);

      // Route from start location to first city
      if (cities.length > 0) {
        const route = await this.calculateSingleRoute(
          startLocation,
          cities[0],
          currentDate,
          passengers,
          locationAirports
        );
        routes.push(route);
        currentDate = new Date(
          currentDate.getTime() + daysPerCity * 24 * 60 * 60 * 1000
        );
      }

      // Routes between cities
      for (let i = 0; i < cities.length - 1; i++) {
        const route = await this.calculateSingleRoute(
          cities[i],
          cities[i + 1],
          currentDate,
          passengers,
          locationAirports
        );
        routes.push(route);
        currentDate = new Date(
          currentDate.getTime() + daysPerCity * 24 * 60 * 60 * 1000
        );
      }

      // Route back to start location
      if (cities.length > 0) {
        const route = await this.calculateSingleRoute(
          cities[cities.length - 1],
          startLocation,
          currentDate,
          passengers,
          locationAirports
        );
        routes.push(route);
      }

      return routes;
    } catch (error) {
      console.error("❌ Error calculating travel routes:", error);
      throw error;
    }
  }

  /**
   * Calculate single route between two locations
   */
  private async calculateSingleRoute(
    from: string,
    to: string,
    departureDate: Date,
    passengers: number,
    locationAirports: Map<string, AirportInfo[]>
  ): Promise<TravelRoute> {
    const fromAirports = locationAirports.get(from) || [];
    const toAirports = locationAirports.get(to) || [];

    // Determine if flight is needed (distance-based logic)
    const needsFlight = await this.requiresFlight(
      from,
      to,
      fromAirports,
      toAirports
    );

    const route: TravelRoute = {
      from,
      to,
      departureDate: departureDate.toISOString().split("T")[0],
      travelMode: needsFlight ? "FLIGHT" : "GROUND",
      estimatedTravelTime: "",
      estimatedCost: {
        min: 0,
        max: 0,
        currency: "USD",
      },
    };

    if (needsFlight && fromAirports.length > 0 && toAirports.length > 0) {
      // Search for flights
      try {
        const flights = await this.searchFlights({
          originLocationCode: fromAirports[0].iataCode,
          destinationLocationCode: toAirports[0].iataCode,
          departureDate: route.departureDate,
          adults: passengers,
          max: 5,
        });

        route.flights = flights;

        if (flights.length > 0) {
          const prices = flights.map((f) => parseFloat(f.price.total));
          route.estimatedCost = {
            min: Math.min(...prices),
            max: Math.max(...prices),
            currency: flights[0].price.currency,
          };
          route.estimatedTravelTime =
            flights[0].itineraries[0]?.duration || "Unknown";
        } else {
          // No flights found, set default values
          route.estimatedCost = {
            min: 0,
            max: 0,
            currency: "USD",
          };
          route.estimatedTravelTime = "Unknown";
        }
      } catch (error) {
        console.error(
          `❌ Error searching flights from ${from} to ${to}:`,
          error
        );
        // Set default values on error
        route.estimatedCost = {
          min: 0,
          max: 0,
          currency: "USD",
        };
        route.estimatedTravelTime = "Unknown";
      }
    }

    return route;
  }

  /**
   * Check if airports are available for both locations
   */
  private async requiresFlight(
    from: string,
    to: string,
    fromAirports: AirportInfo[],
    toAirports: AirportInfo[]
  ): Promise<boolean> {
    console.log(`🤔 Checking airports availability from ${from} to ${to}`);

    // Only proceed with flight search if both locations have airports
    if (fromAirports.length === 0 || toAirports.length === 0) {
      console.log(
        `⚠️ No airports available for ${from} or ${to}, skipping flight search`
      );
      return false;
    }

    console.log(
      `✅ Airports available for both locations, proceeding with flight search`
    );
    return true;
  }

  /**
   * Format date string for Amadeus API (YYYY-MM-DD)
   */
  private formatDateForAPI(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toISOString().split("T")[0];
  }

  /**
   * Validate IATA code format
   */
  private isValidIATACode(code: string): boolean {
    return /^[A-Z]{3}$/.test(code.toUpperCase());
  }
}

export const amadeusService = new AmadeusService();
