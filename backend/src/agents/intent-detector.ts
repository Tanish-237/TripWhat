import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

/**
 * Intent schema for structured output
 */
export const IntentSchema = z.object({
  primary_intent: z.enum([
    'search_destination',
    'search_attractions',
    'search_hotels',
    'search_flights',
    'search_restaurants',
    'plan_trip',
    'get_details',
    'find_nearby',
    'calculate_distance',
    'get_directions',
    'web_search',
    'get_weather',
    'convert_currency',
    'estimate_budget',
    'casual_chat',
    'unknown'
  ]).describe('The primary intent of the user query'),
  
  entities: z.object({
    location: z.string().optional().describe('Main location/destination mentioned'),
    origin: z.string().optional().describe('Starting location for travel'),
    destination: z.string().optional().describe('Destination for travel'),
    dates: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional().describe('Travel dates in ISO format'),
    duration: z.number().optional().describe('Number of days for the trip'),
    budget: z.enum(['budget', 'mid-range', 'luxury']).optional().describe('Budget preference'),
    number_of_people: z.number().optional().describe('Number of travelers'),
    preferences: z.array(z.string()).optional().describe('User preferences like adventure, culture, food, etc.'),
    category: z.string().optional().describe('Category of interest like museums, parks, restaurants'),
    query_terms: z.array(z.string()).optional().describe('Key search terms'),
  }).describe('Extracted entities from the query'),
  
  tools_to_call: z.array(z.string()).describe('List of tools that should be called to fulfill this request'),
  
  confidence: z.number().min(0).max(1).describe('Confidence score for the intent detection'),
  
  reasoning: z.string().describe('Brief explanation of why this intent was chosen'),
});

export type DetectedIntent = z.infer<typeof IntentSchema>;

/**
 * LLM-based Intent Detector
 * Uses GPT to understand user queries and determine which tools to call
 */
export class IntentDetector {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3, // Lower temperature for more consistent intent detection
    });
  }

  /**
   * Detect user intent from query
   */
  async detectIntent(userQuery: string, conversationHistory?: string[]): Promise<DetectedIntent> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(userQuery, conversationHistory);

      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      // Parse the JSON response
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = IntentSchema.parse(parsed);

      console.log('🎯 [INTENT DETECTOR] Detected:', {
        intent: validated.primary_intent,
        tools: validated.tools_to_call,
        confidence: validated.confidence,
      });

      return validated;
    } catch (error) {
      console.error('Intent detection error:', error);
      
      // Fallback to simple keyword-based detection
      return this.fallbackDetection(userQuery);
    }
  }

  /**
   * Build system prompt for intent detection
   */
  private buildSystemPrompt(): string {
    return `You are an expert travel assistant intent classifier. Your job is to analyze user queries about travel and determine:
1. What the user wants to do (primary intent)
2. What information they're asking about (entities)
3. Which tools should be called to help them (tools_to_call)

Available Tools:
- search_destinations: Search for cities, countries, or destinations
- search_attractions: Find tourist attractions, monuments, museums
- search_hotels: Find accommodation options
- search_flights: Search for flight options
- search_restaurants: Find dining options
- get_nearby_attractions: Find attractions near a location
- get_place_details: Get detailed info about a specific place
- calculate_distance: Calculate distance between two locations
- get_directions: Get routing/directions
- web_search: Search the web for travel information
- get_weather: Get weather forecast
- convert_currency: Convert between currencies
- estimate_budget: Estimate trip costs
- plan_trip: Create a full itinerary

Intent Categories:
- search_destination: User wants to explore a destination
- search_attractions: Looking for things to do/see
- search_hotels: Looking for places to stay
- search_flights: Looking for flight options
- search_restaurants: Looking for food/dining
- plan_trip: Wants a full itinerary
- get_details: Wants more info about specific place
- find_nearby: Looking for things near a location
- calculate_distance: Wants distance/travel time
- get_directions: Wants routing information
- web_search: General travel research
- get_weather: Weather information
- convert_currency: Currency conversion
- estimate_budget: Budget planning
- casual_chat: Just chatting, no specific intent
- unknown: Cannot determine intent

Respond with ONLY a valid JSON object matching this schema:
{
  "primary_intent": "intent_name",
  "entities": {
    "location": "place name if mentioned",
    "origin": "starting point if mentioned",
    "destination": "destination if mentioned",
    "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "duration": number_of_days,
    "budget": "budget|mid-range|luxury",
    "number_of_people": number,
    "preferences": ["preference1", "preference2"],
    "category": "type of attraction/activity",
    "query_terms": ["search", "terms"]
  },
  "tools_to_call": ["tool1", "tool2"],
  "confidence": 0.0-1.0,
  "reasoning": "why this intent was chosen"
}`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(userQuery: string, conversationHistory?: string[]): string {
    let prompt = `Analyze this user query and determine the intent:\n\nQuery: "${userQuery}"`;

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `\n\nRecent conversation context:\n${conversationHistory.slice(-3).join('\n')}`;
    }

    prompt += '\n\nProvide your analysis as a JSON object.';
    return prompt;
  }

  /**
   * Fallback intent detection using simple keyword matching
   */
  private fallbackDetection(userQuery: string): DetectedIntent {
    const query = userQuery.toLowerCase();
    let intent: DetectedIntent['primary_intent'] = 'unknown';
    let tools: string[] = [];

    // Simple keyword matching
    if (query.includes('hotel') || query.includes('accommodation') || query.includes('stay')) {
      intent = 'search_hotels';
      tools = ['search_hotels'];
    } else if (query.includes('flight') || query.includes('fly')) {
      intent = 'search_flights';
      tools = ['search_flights'];
    } else if (query.includes('restaurant') || query.includes('food') || query.includes('eat')) {
      intent = 'search_restaurants';
      tools = ['search_restaurants', 'search_attractions'];
    } else if (query.includes('plan') && query.includes('trip')) {
      intent = 'plan_trip';
      tools = ['search_destinations', 'search_attractions', 'search_hotels', 'search_restaurants'];
    } else if (query.includes('weather')) {
      intent = 'get_weather';
      tools = ['get_weather'];
    } else if (query.includes('distance') || query.includes('how far')) {
      intent = 'calculate_distance';
      tools = ['calculate_distance'];
    } else if (query.includes('nearby') || query.includes('near')) {
      intent = 'find_nearby';
      tools = ['get_nearby_attractions'];
    } else if (query.includes('search') || query.includes('find') || query.includes('show')) {
      intent = 'search_attractions';
      tools = ['search_attractions', 'search_destinations'];
    } else {
      intent = 'casual_chat';
      tools = [];
    }

    return {
      primary_intent: intent,
      entities: {
        query_terms: userQuery.split(' ').filter(word => word.length > 3),
      },
      tools_to_call: tools,
      confidence: 0.6,
      reasoning: 'Fallback keyword-based detection',
    };
  }
}

// Export singleton instance
export const intentDetector = new IntentDetector();
