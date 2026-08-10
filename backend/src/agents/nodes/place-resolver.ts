import type { ResolvedPlace } from './types.js';

interface ResolveContext {
  query: string;
  cities: string[];
  conversationContext: Map<string, ResolvedPlace>;
}

/**
 * Place Resolver Node
 * 
 * Resolves entity strings to canonical places using cache tiers:
 * 1. Conversation context (free)
 * 2. DestinationBaseline collection (pre-computed for popular destinations)
 * 3. Live tools (Google Places lookup)
 * 4. Web search (only for niche/ambiguous places, then written back to baseline)
 */
export async function resolvePlaces(ctx: ResolveContext): Promise<ResolvedPlace[]> {
  const results: ResolvedPlace[] = [];

  for (const cityName of ctx.cities) {
    // Tier 1: Conversation context
    const cached = ctx.conversationContext.get(cityName.toLowerCase());
    if (cached) {
      results.push({ ...cached, provenance: 'context' });
      continue;
    }

    // Tier 2: DestinationBaseline
    const baseline = await tryBaseline(cityName);
    if (baseline) {
      results.push(baseline);
      continue;
    }

    // Tier 3: Google Places lookup
    const googleResult = await tryGooglePlaces(cityName);
    if (googleResult) {
      results.push(googleResult);
      continue;
    }

    // Tier 4: Web search fallback (rare)
    const webResult = await tryWebSearch(cityName);
    if (webResult) {
      results.push(webResult);
      // Write back to baseline cache for future lookups
      await writeBackToBaseline(cityName, webResult);
    } else {
      // Last resort: minimal placeholder
      results.push({
        name: cityName,
        provenance: 'context',
      });
    }
  }

  return results;
}

async function tryBaseline(cityName: string): Promise<ResolvedPlace | null> {
  try {
    const { DestinationBaseline } = await import('../../models/DestinationBaseline.js');
    const key = slugifyCity(cityName);
    const baseline = await (DestinationBaseline as any).findOne({ key });
    if (baseline) {
      return {
        name: baseline.name,
        placeId: baseline.placeId,
        coordinates: baseline.coordinates,
        country: baseline.country,
        provenance: 'baseline',
        baselineKey: key,
      };
    }
  } catch {
    // DestinationBaseline model might not exist yet
  }
  return null;
}

async function tryGooglePlaces(cityName: string): Promise<ResolvedPlace | null> {
  try {
    const { googlePlacesAPI } = await import('../../services/googlePlacesAPI.js');
    const places = await googlePlacesAPI.searchPlaces(cityName);
    if (places.length > 0) {
      const place = places[0];
      return {
        name: place.displayName || place.name || cityName,
        placeId: place.id,
        coordinates: place.location
          ? { lat: place.location.latitude, lng: place.location.longitude }
          : undefined,
        provenance: 'google_places',
      };
    }
  } catch {
    // Google Places API might not be configured
  }
  return null;
}

async function tryWebSearch(cityName: string): Promise<ResolvedPlace | null> {
  try {
    const { openaiWebSearch } = await import('../../services/openaiWebSearch.js');
    const result = await openaiWebSearch.findTopAttractions(cityName, 'general', [], 1);
    if (result && result.city) {
      return {
        name: cityName,
        provenance: 'web_search',
      };
    }
  } catch {
    // Web search might not be available
  }
  return null;
}

async function writeBackToBaseline(cityName: string, place: ResolvedPlace): Promise<void> {
  try {
    const { DestinationBaseline } = await import('../../models/DestinationBaseline.js');
    const key = slugifyCity(cityName);
    await (DestinationBaseline as any).findOneAndUpdate(
      { key },
      {
        key,
        name: place.name,
        placeId: place.placeId,
        coordinates: place.coordinates,
        country: place.country,
        popularityScore: 0,
        topAttractions: [],
        topRestaurants: [],
        neighborhoods: [],
        routeTemplates: [],
        refreshedAt: new Date(),
        ttlDays: 30,
      },
      { upsert: true }
    );
  } catch {
    // Silently fail - baseline write-back is best-effort
  }
}

function slugifyCity(city: string): string {
  return city.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
