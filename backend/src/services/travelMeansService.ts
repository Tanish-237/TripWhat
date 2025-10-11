import {
  amadeusService,
  type TravelRoute,
  type FlightSearchParams,
} from "./amadeusService.js";
import { v4 as uuidv4 } from "uuid";

export interface TravelMeansRequest {
  startLocation: string;
  cities: string[];
  startDate: Date;
  totalDays: number;
  passengers: number;
  preferences?: {
    preferredAirlines?: string[];
    travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
    maxStops?: number;
    preferDirectFlights?: boolean;
    preferGroundTransport?: boolean;
  };
}

export interface TravelMeansResponse {
  routes: TravelRoute[];
  totalEstimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  totalTravelTime: string;
  recommendations: TravelRecommendation[];
}

export interface TravelRecommendation {
  type: "COST_EFFECTIVE" | "TIME_EFFICIENT" | "COMFORT" | "DIRECT_FLIGHTS";
  routeIndices: number[];
  description: string;
  estimatedSavings?: number;
  estimatedTimeSaving?: string;
}

class TravelMeansService {
  /**
   * Calculate comprehensive travel means for a multi-city trip
   */
  async calculateTravelMeans(
    request: TravelMeansRequest
  ): Promise<TravelMeansResponse> {
    console.log(
      `🧳 Calculating travel means for trip: ${
        request.startLocation
      } → ${request.cities.join(" → ")} → ${request.startLocation}`
    );

    try {
      // Calculate routes using Amadeus service
      const routes = await amadeusService.calculateTravelRoutes(
        request.startLocation,
        request.cities,
        request.startDate,
        request.totalDays,
        request.passengers
      );

      // Apply preferences to routes
      const optimizedRoutes = await this.optimizeRoutesWithPreferences(
        routes,
        request.preferences
      );

      // Calculate total costs and time
      const totalCosts = this.calculateTotalCosts(optimizedRoutes);
      const totalTravelTime = this.calculateTotalTravelTime(optimizedRoutes);

      // Generate recommendations
      const recommendations = this.generateRecommendations(optimizedRoutes);

      const response: TravelMeansResponse = {
        routes: optimizedRoutes,
        totalEstimatedCost: totalCosts,
        totalTravelTime,
        recommendations,
      };

      console.log(
        `✅ Generated ${routes.length} travel routes with total cost: ${totalCosts.min}-${totalCosts.max} ${totalCosts.currency}`
      );
      return response;
    } catch (error) {
      console.error("❌ Error calculating travel means:", error);
      throw new Error(`Failed to calculate travel means: ${error}`);
    }
  }

  /**
   * Search flights between specific airports
   */
  async searchFlights(params: FlightSearchParams) {
    try {
      return await amadeusService.searchFlights(params);
    } catch (error) {
      console.error("❌ Error searching flights:", error);
      throw error;
    }
  }

  /**
   * Get airport information for a city
   */
  async getAirportsForCity(cityName: string) {
    try {
      return await amadeusService.searchAirports(cityName);
    } catch (error) {
      console.error(`❌ Error getting airports for ${cityName}:`, error);
      return [];
    }
  }

  /**
   * Optimize routes based on user preferences
   */
  private async optimizeRoutesWithPreferences(
    routes: TravelRoute[],
    preferences?: TravelMeansRequest["preferences"]
  ): Promise<TravelRoute[]> {
    if (!preferences) return routes;

    const optimizedRoutes = [...routes];

    for (let i = 0; i < optimizedRoutes.length; i++) {
      const route = optimizedRoutes[i];

      // Filter flights based on preferences
      if (route.flights && route.flights.length > 0) {
        let filteredFlights = [...route.flights];

        // Filter by preferred airlines
        if (
          preferences.preferredAirlines &&
          preferences.preferredAirlines.length > 0
        ) {
          const preferredFlights = filteredFlights.filter((flight) =>
            flight.itineraries.some((itinerary) =>
              itinerary.segments.some((segment) =>
                preferences.preferredAirlines!.includes(segment.carrierCode)
              )
            )
          );
          if (preferredFlights.length > 0) {
            filteredFlights = preferredFlights;
          }
        }

        // Filter by max stops
        if (preferences.maxStops !== undefined) {
          filteredFlights = filteredFlights.filter((flight) =>
            flight.itineraries.every((itinerary) =>
              itinerary.segments.every(
                (segment) => segment.numberOfStops <= preferences.maxStops!
              )
            )
          );
        }

        // Prefer direct flights
        if (preferences.preferDirectFlights) {
          const directFlights = filteredFlights.filter((flight) =>
            flight.itineraries.every((itinerary) =>
              itinerary.segments.every((segment) => segment.numberOfStops === 0)
            )
          );
          if (directFlights.length > 0) {
            filteredFlights = directFlights;
          }
        }

        // Sort by price (cheapest first)
        filteredFlights.sort(
          (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
        );

        route.flights = filteredFlights.slice(0, 5); // Keep top 5 options
      }

      // If prefer ground transport, prioritize ground options
      if (
        preferences.preferGroundTransport &&
        route.groundTransport &&
        route.groundTransport.length > 0
      ) {
        route.travelMode = "GROUND";
        // Sort ground transport by cost
        route.groundTransport.sort((a, b) => a.cost.amount - b.cost.amount);
      }
    }

    return optimizedRoutes;
  }

  /**
   * Calculate total costs across all routes
   */
  private calculateTotalCosts(routes: TravelRoute[]): {
    min: number;
    max: number;
    currency: string;
  } {
    let totalMin = 0;
    let totalMax = 0;
    const currency =
      routes.length > 0 ? routes[0].estimatedCost.currency : "USD";

    for (const route of routes) {
      totalMin += route.estimatedCost.min;
      totalMax += route.estimatedCost.max;
    }

    return { min: totalMin, max: totalMax, currency };
  }

  /**
   * Calculate total travel time
   */
  private calculateTotalTravelTime(routes: TravelRoute[]): string {
    let totalMinutes = 0;

    for (const route of routes) {
      // Parse duration string (e.g., "PT2H30M" or "4-6 hours")
      const duration = route.estimatedTravelTime;
      if (duration.startsWith("PT")) {
        // ISO 8601 duration format
        const hours = duration.match(/(\d+)H/)?.[1] || "0";
        const minutes = duration.match(/(\d+)M/)?.[1] || "0";
        totalMinutes += parseInt(hours) * 60 + parseInt(minutes);
      } else {
        // Parse "4-6 hours" format
        const match = duration.match(/(\d+)(?:-\d+)?\s*hours?/);
        if (match) {
          totalMinutes += parseInt(match[1]) * 60;
        }
      }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Generate travel recommendations
   */
  private generateRecommendations(
    routes: TravelRoute[]
  ): TravelRecommendation[] {
    const recommendations: TravelRecommendation[] = [];

    // Find most cost-effective routes
    const costEffectiveRoutes = routes
      .map((route, index) => ({ route, index, cost: route.estimatedCost.min }))
      .filter((item) => item.route.flights && item.route.flights.length > 0)
      .sort((a, b) => a.cost - b.cost)
      .slice(0, Math.ceil(routes.length / 2));

    if (costEffectiveRoutes.length > 0) {
      recommendations.push({
        type: "COST_EFFECTIVE",
        routeIndices: costEffectiveRoutes.map((item) => item.index),
        description: "Most budget-friendly flight options across your journey",
        estimatedSavings: costEffectiveRoutes.reduce(
          (total, item) => total + (item.route.estimatedCost.max - item.cost),
          0
        ),
      });
    }

    // Find direct flights
    const directFlightRoutes = routes
      .map((route, index) => ({ route, index }))
      .filter(
        (item) =>
          item.route.flights &&
          item.route.flights.some((flight) =>
            flight.itineraries.every((itinerary) =>
              itinerary.segments.every((segment) => segment.numberOfStops === 0)
            )
          )
      );

    if (directFlightRoutes.length > 0) {
      recommendations.push({
        type: "DIRECT_FLIGHTS",
        routeIndices: directFlightRoutes.map((item) => item.index),
        description: "Direct flights available - no layovers required",
        estimatedTimeSaving: "Save 2-4 hours per flight",
      });
    }

    // Comfort recommendation (business/first class)
    const comfortRoutes = routes
      .map((route, index) => ({ route, index }))
      .filter(
        (item) =>
          item.route.flights &&
          item.route.flights.some((flight) =>
            flight.travelerPricings?.some((pricing) =>
              pricing.fareDetailsBySegment.some(
                (segment) =>
                  segment.cabin === "BUSINESS" || segment.cabin === "FIRST"
              )
            )
          )
      );

    if (comfortRoutes.length > 0) {
      recommendations.push({
        type: "COMFORT",
        routeIndices: comfortRoutes.map((item) => item.index),
        description: "Premium cabin options available for enhanced comfort",
      });
    }

    // Time-efficient recommendation
    const fastRoutes = routes
      .map((route, index) => ({ route, index }))
      .filter((item) => item.route.travelMode === "FLIGHT")
      .sort((a, b) => {
        const aDuration = this.parseDurationToMinutes(
          a.route.estimatedTravelTime
        );
        const bDuration = this.parseDurationToMinutes(
          b.route.estimatedTravelTime
        );
        return aDuration - bDuration;
      })
      .slice(0, Math.ceil(routes.length / 2));

    if (fastRoutes.length > 0) {
      recommendations.push({
        type: "TIME_EFFICIENT",
        routeIndices: fastRoutes.map((item) => item.index),
        description: "Fastest travel options to minimize journey time",
      });
    }

    return recommendations;
  }

  /**
   * Parse duration string to minutes
   */
  private parseDurationToMinutes(duration: string): number {
    if (duration.startsWith("PT")) {
      const hours = duration.match(/(\d+)H/)?.[1] || "0";
      const minutes = duration.match(/(\d+)M/)?.[1] || "0";
      return parseInt(hours) * 60 + parseInt(minutes);
    } else {
      const match = duration.match(/(\d+)(?:-\d+)?\s*hours?/);
      if (match) {
        return parseInt(match[1]) * 60;
      }
    }
    return 0;
  }

  /**
   * Get travel means for a specific route
   */
  async getTravelMeansForRoute(
    from: string,
    to: string,
    departureDate: Date,
    passengers: number,
    preferences?: TravelMeansRequest["preferences"]
  ): Promise<TravelRoute> {
    try {
      const routes = await amadeusService.calculateTravelRoutes(
        from,
        [to],
        departureDate,
        1, // Single day for route
        passengers
      );

      if (routes.length > 0) {
        const optimizedRoutes = await this.optimizeRoutesWithPreferences(
          routes,
          preferences
        );
        return optimizedRoutes[0];
      }

      throw new Error("No routes found");
    } catch (error) {
      console.error(
        `❌ Error getting travel means from ${from} to ${to}:`,
        error
      );
      throw error;
    }
  }
}

export const travelMeansService = new TravelMeansService();
