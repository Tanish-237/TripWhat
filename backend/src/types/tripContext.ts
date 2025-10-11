/**
 * Trip context from frontend planning flow
 */
export interface TripContext {
  // Destinations
  cities: CityDestination[];
  startDate: string; // ISO date string
  startLocation?:
    | {
        name: string;
        placeId?: string;
        description?: string;
      }
    | string; // Starting point for travel planning (can be object or string for backwards compatibility)
  totalDays?: number;

  // Budget
  budget: Budget;
  budgetMode: "capped" | "flexible";

  // Preferences
  people: number;
  travelType: TravelType;
  preferences?: string[]; // Activity preferences
  activityLevel?: "low" | "medium" | "high";
  pacing?: "relaxed" | "moderate" | "fast";

  // Travel preferences
  travelPreferences?: {
    preferredAirlines?: string[];
    travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
    maxStops?: number;
    preferDirectFlights?: boolean;
    preferGroundTransport?: boolean;
  };
}

export interface CityDestination {
  id: string;
  name: string;
  days: number;
  order: number;
}

export interface Budget {
  total: number;
  travel: number; // Either % (capped) or $ (flexible)
  accommodation: number;
  food: number;
  events: number;
}

export type TravelType =
  | "leisure"
  | "business"
  | "adventure"
  | "cultural"
  | "family"
  | "solo";

/**
 * Mapping of travel types to activity preferences
 */
export const TRAVEL_TYPE_PREFERENCES: Record<
  TravelType,
  {
    categories: string[];
    pacing: "relaxed" | "moderate" | "fast";
    activityLevel: "low" | "medium" | "high";
    description: string;
  }
> = {
  leisure: {
    categories: [
      "beaches",
      "parks",
      "museums",
      "restaurants",
      "shopping",
      "natural",
    ],
    pacing: "relaxed",
    activityLevel: "low",
    description: "Focus on relaxation, sightseeing, and enjoyment",
  },
  business: {
    categories: ["restaurants", "cultural", "museums", "cafes", "hotels"],
    pacing: "fast",
    activityLevel: "low",
    description: "Efficient schedule with quality dining and minimal leisure",
  },
  adventure: {
    categories: [
      "natural",
      "sport",
      "climbing",
      "interesting_places",
      "amusement_parks",
    ],
    pacing: "fast",
    activityLevel: "high",
    description: "Active experiences, outdoor activities, and exploration",
  },
  cultural: {
    categories: [
      "museums",
      "historic",
      "architecture",
      "theatres_and_entertainments",
      "cultural",
    ],
    pacing: "moderate",
    activityLevel: "medium",
    description: "Deep cultural immersion, history, and local experiences",
  },
  family: {
    categories: [
      "amusement_parks",
      "parks",
      "museums",
      "restaurants",
      "interesting_places",
      "natural",
    ],
    pacing: "moderate",
    activityLevel: "medium",
    description: "Kid-friendly activities with balanced pacing",
  },
  solo: {
    categories: [
      "museums",
      "cafes",
      "parks",
      "interesting_places",
      "cultural",
      "restaurants",
    ],
    pacing: "moderate",
    activityLevel: "medium",
    description: "Flexible schedule for independent exploration",
  },
};

/**
 * Budget allocation per day based on budget mode
 */
export function calculateDailyBudget(
  budget: Budget,
  budgetMode: "capped" | "flexible",
  days: number
): {
  totalPerDay: number;
  accommodation: number;
  food: number;
  activities: number;
  transport: number;
} {
  const totalBudget = budget.total;

  if (budgetMode === "capped") {
    // Budget is in percentages
    return {
      totalPerDay: totalBudget / days,
      accommodation: (totalBudget * (budget.accommodation / 100)) / days,
      food: (totalBudget * (budget.food / 100)) / days,
      activities: (totalBudget * (budget.events / 100)) / days,
      transport: (totalBudget * (budget.travel / 100)) / days,
    };
  } else {
    // Budget is in dollar amounts
    return {
      totalPerDay: totalBudget / days,
      accommodation: budget.accommodation / days,
      food: budget.food / days,
      activities: budget.events / days,
      transport: budget.travel / days,
    };
  }
}
