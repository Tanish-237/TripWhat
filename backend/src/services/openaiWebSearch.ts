import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

/**
 * OpenAI Web Search Service
 * Uses OpenAI with web search to find top tourist destinations
 */

const AttractionSchema = z.object({
  name: z.string().describe('Name of the attraction'),
  description: z.string().describe('Brief description of what makes it special'),
  category: z.string().describe('Type: museum, landmark, park, restaurant, etc.'),
  popularity: z.enum(['very_high', 'high', 'medium']).describe('Popularity level'),
  mustVisit: z.boolean().describe('Is this a must-visit attraction?'),
  estimatedDuration: z.string().describe('Typical visit duration (e.g., "2-3 hours")'),
  bestTimeToVisit: z.string().optional().describe('Best time of day or season'),
  tags: z.array(z.string()).describe('Tags like cultural, family-friendly, instagram-worthy')
});

const DestinationSearchResultSchema = z.object({
  city: z.string(),
  country: z.string(),
  attractions: z.array(AttractionSchema),
  localTips: z.array(z.string()).describe('Local tips and recommendations'),
  bestSeason: z.string().optional().describe('Best time to visit this destination')
});

export type Attraction = z.infer<typeof AttractionSchema>;
export type DestinationSearchResult = z.infer<typeof DestinationSearchResultSchema>;

export class OpenAIWebSearchService {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3
    });
  }

  /**
   * Search for top tourist attractions using web search
   */
  async findTopAttractions(
    city: string,
    travelType: string,
    preferences: string[],
    numberOfAttractions: number = 20
  ): Promise<DestinationSearchResult> {
    console.log(`🌐 [WEB SEARCH] Finding attractions in ${city} for ${travelType} travel`);

    const prompt = this.buildSearchPrompt(city, travelType, preferences, numberOfAttractions);

    try {
      const response = await this.model.invoke(prompt);
      const content = response.content as string;

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = DestinationSearchResultSchema.parse(parsed);

      console.log(`✅ [WEB SEARCH] Found ${validated.attractions.length} attractions in ${city}`);
      console.log(`   Must-visit: ${validated.attractions.filter(a => a.mustVisit).length}`);
      console.log(`   High popularity: ${validated.attractions.filter(a => a.popularity === 'very_high').length}`);

      return validated;
    } catch (error) {
      console.error('❌ [WEB SEARCH] Error:', error);
      
      // Return fallback empty result
      return {
        city,
        country: '',
        attractions: [],
        localTips: []
      };
    }
  }

  /**
   * Build search prompt for OpenAI
   */
  private buildSearchPrompt(
    city: string,
    travelType: string,
    preferences: string[],
    count: number
  ): string {
    return `You are an expert travel researcher. Search the web and provide comprehensive information about the TOP tourist attractions in ${city}.

**Travel Context:**
- City: ${city}
- Travel Type: ${travelType}
- Preferences: ${preferences.join(', ')}
- Required number of attractions: ${count}

**Instructions:**
1. Search for the most popular, highest-rated tourist attractions in ${city}
2. Focus on attractions that match the "${travelType}" travel style
3. Include a diverse mix: landmarks, museums, parks, restaurants, viewpoints, cultural sites
4. Prioritize attractions that:
   - Are consistently recommended in travel guides (Lonely Planet, TripAdvisor, Google Travel)
   - Have high ratings and visitor reviews
   - Are iconic or unique to ${city}
   - Match the user's preferences: ${preferences.join(', ')}

**What to include for each attraction:**
- Official name
- Why it's special (brief description)
- Category (museum, landmark, park, restaurant, etc.)
- Popularity level (very_high, high, medium)
- Must-visit status (true/false)
- Estimated visit duration
- Best time to visit
- Relevant tags

**Response format:**
Return ONLY valid JSON matching this structure:
{
  "city": "${city}",
  "country": "Country name",
  "attractions": [
    {
      "name": "Eiffel Tower",
      "description": "Iconic iron lattice tower, symbol of Paris",
      "category": "landmark",
      "popularity": "very_high",
      "mustVisit": true,
      "estimatedDuration": "2-3 hours",
      "bestTimeToVisit": "Sunset or evening for lights",
      "tags": ["iconic", "romantic", "instagram-worthy", "family-friendly"]
    }
  ],
  "localTips": [
    "Book tickets online to skip queues",
    "Visit early morning for fewer crowds"
  ],
  "bestSeason": "Spring (April-June) or Fall (September-November)"
}

Focus on quality over quantity. Only include attractions you're confident about from web research.`;
  }

  /**
   * Filter attractions by alignment with preferences
   */
  filterByAlignment(
    attractions: Attraction[],
    travelType: string,
    preferences: string[]
  ): Attraction[] {
    return attractions
      .filter(attr => {
        // Always include must-visit attractions
        if (attr.mustVisit) return true;

        // Check if tags match preferences
        const hasMatchingTag = attr.tags.some(tag =>
          preferences.some(pref => 
            tag.toLowerCase().includes(pref.toLowerCase()) ||
            pref.toLowerCase().includes(tag.toLowerCase())
          )
        );

        // Check if category matches travel type
        const categoryMatch = this.doesCategoryMatchTravelType(attr.category, travelType);

        return hasMatchingTag || categoryMatch;
      })
      .sort((a, b) => {
        // Sort by: must-visit > popularity > tags match
        if (a.mustVisit !== b.mustVisit) return a.mustVisit ? -1 : 1;
        
        const popOrder = { very_high: 3, high: 2, medium: 1 };
        return popOrder[b.popularity] - popOrder[a.popularity];
      });
  }

  /**
   * Check if category matches travel type
   */
  private doesCategoryMatchTravelType(category: string, travelType: string): boolean {
    const categoryMap: Record<string, string[]> = {
      cultural: ['museum', 'gallery', 'historic', 'monument', 'temple', 'church', 'palace'],
      adventure: ['park', 'hiking', 'mountain', 'outdoor', 'sport'],
      leisure: ['beach', 'spa', 'park', 'garden', 'shopping'],
      business: ['restaurant', 'cafe', 'conference', 'hotel'],
      family: ['zoo', 'aquarium', 'park', 'amusement_park', 'playground'],
      solo: ['cafe', 'museum', 'market', 'walking_tour']
    };

    const relevantCategories = categoryMap[travelType.toLowerCase()] || [];
    return relevantCategories.some(cat => 
      category.toLowerCase().includes(cat) || cat.includes(category.toLowerCase())
    );
  }
}

// Export singleton
export const openaiWebSearch = new OpenAIWebSearchService();
