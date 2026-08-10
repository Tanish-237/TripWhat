import type {
  BuildContext,
  BuildOptions,
  BuildResult,
  Itinerary,
  DayPlan,
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

  // ─── Delta-only builder (Phase 3.2d) ───

  /**
   * Compute a signature for a day plan.
   * Signature = hash of city + date + slot count + pace.
   * Days with matching signatures are reused verbatim.
   */
  computeDaySignature(day: DayPlan): string {
    const slotCount = day.timeSlots.length;
    const city = day.location || 'unknown';
    const date = day.date || '';
    const pace = day.timeSlots.reduce((sum, ts) => {
      const actCount = (ts.activities?.length || (ts.activity ? 1 : 0));
      return sum + actCount;
    }, 0);
    return `${city}|${date}|${slotCount}|${pace}`;
  }

  /**
   * Delta-only build: reuse existing days with matching signatures,
   * only generate new/invalidated days.
   *
   * @param existingItinerary - current itinerary from trip state
   * @param requiredDays - day plans needed (from route proposal / slot state)
   * @param invalidatedCities - cities whose days must be regenerated
   * @returns updated itinerary + cache metadata
   */
  async buildDelta(
    existingItinerary: Itinerary | null,
    requiredDays: DayPlan[],
    invalidatedCities: string[] = []
  ): Promise<{ itinerary: Itinerary; reusedDayKeys: string[]; newDayKeys: string[] }> {
    if (!existingItinerary || existingItinerary.days.length === 0) {
      // No existing itinerary — build fresh
      const itinerary = createItinerary(
        requiredDays[0]?.location || 'Unknown',
        requiredDays.length,
        requiredDays[0]?.date || undefined
      );
      itinerary.days = requiredDays.map((d, i) => {
        d.signature = this.computeDaySignature(d);
        return d;
      });
      return { itinerary, reusedDayKeys: [], newDayKeys: requiredDays.map(d => d.signature!) };
    }

    const existingBySignature = new Map<string, DayPlan>();
    for (const day of existingItinerary.days) {
      const sig = day.signature || this.computeDaySignature(day);
      existingBySignature.set(sig, day);
    }

    const reusedDayKeys: string[] = [];
    const newDayKeys: string[] = [];
    const finalDays: DayPlan[] = [];

    for (const requiredDay of requiredDays) {
      const sig = this.computeDaySignature(requiredDay);
      const existing = existingBySignature.get(sig);
      const isInvalidated = invalidatedCities.length === 0
        ? false
        : invalidatedCities.includes(requiredDay.location || '');

      if (existing && !isInvalidated) {
        // Reuse existing day verbatim — preserve pinned activities
        finalDays.push(existing);
        reusedDayKeys.push(sig);
      } else {
        // New or invalidated day — needs generation
        requiredDay.signature = sig;
        finalDays.push(requiredDay);
        newDayKeys.push(sig);
      }
    }

    // Re-pin any pinned activities that were in invalidated days
    if (invalidatedCities.length > 0 && existingItinerary) {
      for (const oldDay of existingItinerary.days) {
        if (invalidatedCities.includes(oldDay.location || '')) {
          for (const ts of oldDay.timeSlots) {
            const activities = ts.activities || (ts.activity ? [ts.activity] : []);
            for (const act of activities) {
              if (act.metadata?.pinned) {
                // Find a matching day in finalDays for this city
                const targetDay = finalDays.find(d => d.location === oldDay.location);
                if (targetDay && targetDay.timeSlots.length > 0) {
                  const slot = targetDay.timeSlots[0];
                  if (slot.activities) {
                    slot.activities.unshift(act);
                  } else if (slot.activity) {
                    slot.activities = [act, slot.activity];
                  } else {
                    slot.activity = act;
                    slot.activities = [act];
                  }
                }
              }
            }
          }
        }
      }
    }

    // Renumber days
    finalDays.forEach((d, i) => { d.dayNumber = i + 1; });

    const itinerary: Itinerary = {
      ...existingItinerary,
      days: finalDays,
    };

    return { itinerary, reusedDayKeys, newDayKeys };
  }
}

export const itineraryBuilderService = new ItineraryBuilderService();
