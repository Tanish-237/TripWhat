import { ChatOpenAI } from '@langchain/openai';
import type { RouteProposal, RouteProposalCity, TripState } from './types.js';

/**
 * Route Proposer Node
 * 
 * For plan_trip with cities known: proposes per-city nights split,
 * emits route_proposal payload. On confirm_route, hands to itinerary generation.
 * 
 * Uses gpt-4o-mini for the proposal, cached per city-set.
 */
export class RouteProposer {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.5,
    });
  }

  /**
   * Propose a route (per-city nights split) for the given trip state
   */
  async proposeRoute(tripState: TripState): Promise<RouteProposal> {
    const cities = tripState.cities.map(c => c.name);
    const totalNights = tripState.cities.reduce((sum, c) => sum + (c.nights || 0), 0)
      || (tripState.dates?.start && tripState.dates?.end
        ? Math.ceil((new Date(tripState.dates.end).getTime() - new Date(tripState.dates.start).getTime()) / 86400000)
        : 7);

    // Try baseline route templates first
    const baselineProposal = await this.tryBaselineRoute(cities, totalNights);
    if (baselineProposal) return baselineProposal;

    // LLM-based proposal
    return await this.llmProposeRoute(cities, totalNights, tripState);
  }

  private async tryBaselineRoute(cities: string[], totalNights: number): Promise<RouteProposal | null> {
    try {
      const { DestinationBaseline } = await import('../../models/DestinationBaseline.js');
      // Look for a route template matching the city set
      for (const city of cities) {
        const key = slugifyCity(city);
        const baseline = await (DestinationBaseline as any).findOne({ key });
        if (baseline?.routeTemplates?.length > 0) {
          for (const template of baseline.routeTemplates) {
            if (template.nights === totalNights && template.cities) {
              const templateCities = template.cities.map((c: string) => c.toLowerCase());
              const requestedCities = cities.map(c => c.toLowerCase());
              if (templateCities.every((c: string) => requestedCities.includes(c))) {
                return this.buildProposalFromTemplate(template, cities, totalNights, template.rationale);
              }
            }
          }
        }
      }
    } catch {
      // Baseline not available
    }
    return null;
  }

  private async llmProposeRoute(
    cities: string[],
    totalNights: number,
    tripState: TripState
  ): Promise<RouteProposal> {
    const pace = tripState.pace || 'moderate';
    const preferences = tripState.preferences?.join(', ') || 'general sightseeing';

    const prompt = `You are a travel route planner. Given these cities and total nights, propose a per-city nights split.

Cities: ${cities.join(', ')}
Total nights: ${totalNights}
Pace: ${pace}
Preferences: ${preferences}

Rules:
- Distribute nights across all cities
- Major cities (Tokyo, Paris, London) usually get more nights
- Consider travel time between cities
- Return JSON: {"cities": [{"name": "City", "nights": N, "order": 0}], "rationale": "why this split", "alternatives": [{"cities": [...], "rationale": "..."}]}`;

    try {
      const response = await this.model.invoke([{ role: 'user', content: prompt }]);
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateProposal(parsed, cities, totalNights);
      }
    } catch (error) {
      console.error('[RouteProposer] LLM proposal failed:', error);
    }

    // Fallback: even split
    return this.evenSplit(cities, totalNights);
  }

  private validateProposal(parsed: any, cities: string[], totalNights: number): RouteProposal {
    const proposalCities: RouteProposalCity[] = (parsed.cities || cities.map((name, order) => ({
      name,
      nights: Math.floor(totalNights / cities.length),
      order,
    }))).map((c: any, i: number) => ({
      name: c.name,
      nights: c.nights || Math.floor(totalNights / cities.length),
      order: c.order ?? i,
    }));

    const actualTotal = proposalCities.reduce((sum, c) => sum + c.nights, 0);
    if (actualTotal !== totalNights && proposalCities.length > 0) {
      // Adjust first city to match total
      proposalCities[0].nights += totalNights - actualTotal;
    }

    return {
      cities: proposalCities,
      totalNights,
      rationale: parsed.rationale || 'Even distribution across cities',
      alternatives: parsed.alternatives?.map((alt: any) => ({
        cities: (alt.cities || []).map((c: any, i: number) => ({
          name: c.name,
          nights: c.nights,
          order: c.order ?? i,
        })),
        rationale: alt.rationale || '',
      })),
    };
  }

  private buildProposalFromTemplate(
    template: any,
    cities: string[],
    totalNights: number,
    rationale: string
  ): RouteProposal {
    const proposalCities: RouteProposalCity[] = cities.map((name, order) => {
      const templateCity = template.cities?.find((c: string) =>
        c.toLowerCase() === name.toLowerCase()
      );
      return {
        name,
        nights: templateCity ? Math.floor(totalNights / cities.length) : Math.floor(totalNights / cities.length),
        order,
      };
    });

    return {
      cities: proposalCities,
      totalNights,
      rationale: rationale || 'Based on popular route template',
    };
  }

  private evenSplit(cities: string[], totalNights: number): RouteProposal {
    const perCity = Math.floor(totalNights / cities.length);
    const remainder = totalNights % cities.length;

    return {
      cities: cities.map((name, i) => ({
        name,
        nights: perCity + (i < remainder ? 1 : 0),
        order: i,
      })),
      totalNights,
      rationale: `Even split: ${perCity} nights per city${remainder > 0 ? ` (${remainder} cities get +1)` : ''}`,
    };
  }
}

function slugifyCity(city: string): string {
  return city.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const routeProposer = new RouteProposer();
