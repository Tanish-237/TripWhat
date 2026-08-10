import { getFlightProvider } from './inventory';
import type { FlightOffer, FlightQuery } from './inventory/types';
import { v4 as uuidv4 } from 'uuid';

export interface TravelRoute {
  id: string;
  from: string;
  to: string;
  travelMode: 'FLIGHT' | 'GROUND';
  flights: FlightOffer[];
  groundTransport: GroundTransportOption[];
  estimatedCost: { min: number; max: number; currency: string };
  estimatedTravelTime: string;
  distance?: number;
}

export interface GroundTransportOption {
  type: 'train' | 'bus' | 'car';
  duration: string;
  cost: { amount: number; currency: string };
  provider: string;
  bookingLink?: string;
}

export interface TravelMeansRequest {
  startLocation: string;
  cities: string[];
  startDate: Date;
  totalDays: number;
  passengers: number;
  preferences?: {
    preferredAirlines?: string[];
    travelClass?: 'economy' | 'business' | 'first';
    maxStops?: number;
    preferDirectFlights?: boolean;
    preferGroundTransport?: boolean;
  };
}

export interface TravelMeansResponse {
  routes: TravelRoute[];
  totalEstimatedCost: { min: number; max: number; currency: string };
  totalTravelTime: string;
  recommendations: TravelRecommendation[];
}

export interface TravelRecommendation {
  type: 'COST_EFFECTIVE' | 'TIME_EFFICIENT' | 'COMFORT' | 'DIRECT_FLIGHTS';
  routeIndices: number[];
  description: string;
  estimatedSavings?: number;
  estimatedTimeSaving?: string;
}

class TravelMeansService {
  async calculateTravelMeans(request: TravelMeansRequest): Promise<TravelMeansResponse> {
    try {
      const allCities = [request.startLocation, ...request.cities, request.startLocation];
      const routes: TravelRoute[] = [];

      for (let i = 0; i < allCities.length - 1; i++) {
        const from = allCities[i];
        const to = allCities[i + 1];
        const routeDate = this.calculateSegmentDate(request.startDate, request.totalDays, i, allCities.length - 1);

        const route = await this.getTravelMeansForRoute(
          from,
          to,
          routeDate,
          request.passengers,
          request.preferences
        );
        routes.push(route);
      }

      const optimizedRoutes = this.optimizeRoutesWithPreferences(routes, request.preferences);
      const totalCosts = this.calculateTotalCosts(optimizedRoutes);
      const totalTravelTime = this.calculateTotalTravelTime(optimizedRoutes);
      const recommendations = this.generateRecommendations(optimizedRoutes);

      return {
        routes: optimizedRoutes,
        totalEstimatedCost: totalCosts,
        totalTravelTime,
        recommendations,
      };
    } catch (error) {
      throw new Error(`Failed to calculate travel means: ${error}`);
    }
  }

  async getTravelMeansForRoute(
    from: string,
    to: string,
    departureDate: Date,
    passengers: number,
    preferences?: TravelMeansRequest['preferences']
  ): Promise<TravelRoute> {
    try {
      const provider = getFlightProvider();
      const dateStr = departureDate.toISOString().split('T')[0];

      const query: FlightQuery = {
        origin: from,
        destination: to,
        departureDate: dateStr,
        adults: passengers,
        children: 0,
        travelClass: preferences?.travelClass || 'economy',
        currency: 'USD',
        deepSearch: false,
      };

      let flights: FlightOffer[] = [];
      try {
        flights = await provider.searchOffers(query);
      } catch (err) {
        console.error(`Flight search failed for ${from}→${to}:`, err);
      }

      const minPrice = flights.length > 0 ? Math.min(...flights.map((f) => f.price)) : 0;
      const maxPrice = flights.length > 0 ? Math.max(...flights.map((f) => f.price)) : 0;
      const minDuration = flights.length > 0 ? Math.min(...flights.map((f) => f.totalDuration)) : 0;

      return {
        id: uuidv4(),
        from,
        to,
        travelMode: 'FLIGHT',
        flights,
        groundTransport: [],
        estimatedCost: { min: minPrice, max: maxPrice, currency: 'USD' },
        estimatedTravelTime: this.formatDuration(minDuration),
      };
    } catch (error) {
      throw new Error(`No routes found from ${from} to ${to}: ${error}`);
    }
  }

  private optimizeRoutesWithPreferences(
    routes: TravelRoute[],
    preferences?: TravelMeansRequest['preferences']
  ): TravelRoute[] {
    if (!preferences) return routes;

    for (const route of routes) {
      if (route.flights.length > 0) {
        let filtered = [...route.flights];

        if (preferences.preferredAirlines?.length) {
          const preferred = filtered.filter((f) =>
            f.legs.some((leg) => preferences.preferredAirlines!.includes(leg.airline))
          );
          if (preferred.length > 0) filtered = preferred;
        }

        if (preferences.maxStops !== undefined) {
          filtered = filtered.filter((f) => f.layovers.length <= preferences.maxStops!);
        }

        if (preferences.preferDirectFlights) {
          const direct = filtered.filter((f) => f.layovers.length === 0);
          if (direct.length > 0) filtered = direct;
        }

        filtered.sort((a, b) => a.price - b.price);
        route.flights = filtered.slice(0, 5);
      }

      if (preferences.preferGroundTransport && route.groundTransport.length > 0) {
        route.travelMode = 'GROUND';
        route.groundTransport.sort((a, b) => a.cost.amount - b.cost.amount);
      }
    }

    return routes;
  }

  private calculateTotalCosts(routes: TravelRoute[]): { min: number; max: number; currency: string } {
    let totalMin = 0;
    let totalMax = 0;
    const currency = routes.length > 0 ? routes[0].estimatedCost.currency : 'USD';

    for (const route of routes) {
      totalMin += route.estimatedCost.min;
      totalMax += route.estimatedCost.max;
    }

    return { min: totalMin, max: totalMax, currency };
  }

  private calculateTotalTravelTime(routes: TravelRoute[]): string {
    let totalMinutes = 0;
    for (const route of routes) {
      totalMinutes += this.parseDurationToMinutes(route.estimatedTravelTime);
    }
    return this.formatDuration(totalMinutes);
  }

  private generateRecommendations(routes: TravelRoute[]): TravelRecommendation[] {
    const recommendations: TravelRecommendation[] = [];

    const costEffective = routes
      .map((route, index) => ({ route, index, cost: route.estimatedCost.min }))
      .filter((item) => item.route.flights.length > 0)
      .sort((a, b) => a.cost - b.cost)
      .slice(0, Math.ceil(routes.length / 2));

    if (costEffective.length > 0) {
      recommendations.push({
        type: 'COST_EFFECTIVE',
        routeIndices: costEffective.map((item) => item.index),
        description: 'Most budget-friendly flight options across your journey',
        estimatedSavings: costEffective.reduce(
          (total, item) => total + (item.route.estimatedCost.max - item.cost), 0
        ),
      });
    }

    const directRoutes = routes
      .map((route, index) => ({ route, index }))
      .filter((item) => item.route.flights.some((f) => f.layovers.length === 0));

    if (directRoutes.length > 0) {
      recommendations.push({
        type: 'DIRECT_FLIGHTS',
        routeIndices: directRoutes.map((item) => item.index),
        description: 'Direct flights available - no layovers required',
        estimatedTimeSaving: 'Save 2-4 hours per flight',
      });
    }

    return recommendations;
  }

  private parseDurationToMinutes(duration: string): number {
    const match = duration.match(/(\d+)h\s*(\d+)?m?/);
    if (match) {
      return parseInt(match[1]) * 60 + (parseInt(match[2] || '0'));
    }
    return 0;
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }

  private calculateSegmentDate(startDate: Date, totalDays: number, segmentIndex: number, totalSegments: number): Date {
    const daysPerSegment = Math.floor(totalDays / totalSegments);
    const offsetDays = daysPerSegment * segmentIndex;
    const date = new Date(startDate);
    date.setDate(date.getDate() + offsetDays);
    return date;
  }
}

export const travelMeansService = new TravelMeansService();
