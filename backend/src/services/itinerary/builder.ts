import type {
  BuildContext,
  BuildOptions,
  BuildResult,
} from './types.js';
import { createItinerary } from './types.js';

export class ItineraryBuilderService {
  async build(
    ctx: BuildContext,
    options?: BuildOptions
  ): Promise<BuildResult | null> {
    if (options?.includeTravelMeans && ctx.cities && ctx.cities.length > 0) {
      return this.buildWithTravelMeans(ctx);
    }

    if (ctx.cities && ctx.cities.length > 0) {
      return this.buildMultiCity(ctx);
    }

    return this.buildSingleCity(ctx);
  }

  private async buildSingleCity(ctx: BuildContext): Promise<BuildResult | null> {
    const itinerary = createItinerary(
      ctx.destination,
      ctx.duration,
      ctx.startDate
    );

    if (ctx.preferences) {
      itinerary.tripMetadata.preferences = ctx.preferences;
    }
    if (ctx.travelType) {
      itinerary.tripMetadata.travelType = ctx.travelType;
    }

    return { itinerary };
  }

  private async buildMultiCity(ctx: BuildContext): Promise<BuildResult | null> {
    const totalDays = ctx.totalDays || ctx.cities!.reduce((s, c) => s + c.days, 0);
    const itinerary = createItinerary(
      ctx.cities![0].name,
      totalDays,
      ctx.startDate
    );

    let dayIdx = 0;
    for (const city of ctx.cities!) {
      for (let d = 0; d < city.days; d++) {
        if (dayIdx < itinerary.days.length) {
          const day = itinerary.days[dayIdx];
          day.location = city.name;
          day.title = `Day ${dayIdx + 1} - ${city.name}`;
        }
        dayIdx++;
      }
    }

    if (ctx.preferences) {
      itinerary.tripMetadata.preferences = ctx.preferences;
    }
    if (ctx.travelType) {
      itinerary.tripMetadata.travelType = ctx.travelType;
    }

    return { itinerary };
  }

  private async buildWithTravelMeans(ctx: BuildContext): Promise<BuildResult | null> {
    const result = await this.buildMultiCity(ctx);
    if (!result) return null;

    try {
      const { travelMeansService } = await import('../travelMeansService.js');
      const travelMeans = await travelMeansService.calculateTravelMeans({
        startLocation: typeof ctx.startLocation === 'string'
          ? ctx.startLocation
          : ctx.startLocation?.name || ctx.cities![0].name,
        cities: ctx.cities!.map(c => c.name),
        startDate: ctx.startDate ? new Date(ctx.startDate) : new Date(),
        totalDays: ctx.totalDays || ctx.cities!.reduce((s, c) => s + c.days, 0),
        passengers: ctx.numberOfPeople || 1,
        preferences: ctx.travelPreferences as any,
      });

      return {
        itinerary: result.itinerary,
        travelMeans,
      };
    } catch (error) {
      console.error('[ItineraryBuilder] Travel means calculation failed:', error);
      return result;
    }
  }
}

export const itineraryBuilderService = new ItineraryBuilderService();
