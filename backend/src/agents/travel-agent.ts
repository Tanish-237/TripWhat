import { StateGraph, Annotation } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { openTripMapAPI } from '../mcp-servers/places/api.js';
import { TRAVEL_AGENT_SYSTEM_PROMPT } from './prompts.js';
import type { AgentConfig } from './types.js';
import type { Destination } from '../mcp-servers/places/types.js';

/**
 * Define agent state using Annotation API
 */
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  userQuery: Annotation<string>({
    reducer: (left, right) => right ?? left,
    default: () => '',
  }),
  intent: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  searchResults: Annotation<Destination[] | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  placeDetails: Annotation<any>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  nearbyAttractions: Annotation<Destination[] | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  response: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  error: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  conversationId: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
  timestamp: Annotation<Date | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
});

type AgentState = typeof AgentStateAnnotation.State;

/**
 * Travel Planning Agent using LangGraph
 * 
 * Workflow:
 * 1. User Input → Planner (decides which tools to call)
 * 2. Tool Executor → Calls MCP server tools
 * 3. Response Formatter → Creates conversational response
 */
export class TravelAgent {
  private model: ChatOpenAI;
  private graph: any; // LangGraph compiled graph

  constructor(config: AgentConfig = {}) {
    // Initialize OpenAI model
    this.model = new ChatOpenAI({
      modelName: config.modelName || 'gpt-4o-mini',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      streaming: config.streaming || false,
    });

    // Build the LangGraph workflow
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph state machine
   */private buildGraph() {
  // Define the graph with Annotation and use method chaining
  const workflow = new StateGraph(AgentStateAnnotation)
  .addNode('planner', this.plannerNode.bind(this))
  .addNode('tool_executor', this.toolExecutorNode.bind(this))
  .addNode('response_formatter', this.responseFormatterNode.bind(this))
  .addEdge('__start__', 'planner')
  .addConditionalEdges('planner', (state: AgentState) => {
    // If intent requires tools, go to tool executor
    if (['SEARCH_DESTINATION', 'GET_DETAILS', 'FIND_NEARBY'].includes(state.intent || '')) {
      return 'tool_executor';
    }
    // Otherwise, go directly to response formatter
    return 'response_formatter';
  })
  .addEdge('tool_executor', 'response_formatter')
  .addEdge('response_formatter', '__end__');

return workflow.compile();
}

  /**
   * Planner Node: Analyzes user query and decides which tools to use
   */
  private async plannerNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log('\n🧠 [PLANNER] Analyzing user query:', state.userQuery);
    try {
      const messages = [
        new SystemMessage(TRAVEL_AGENT_SYSTEM_PROMPT),
        new HumanMessage(state.userQuery),
      ];

      const response = await this.model.invoke(messages);
      const content = response.content as string;

      // Simple intent detection based on keywords
      let intent: AgentState['intent'] = 'CASUAL_CHAT';
      
      const query = state.userQuery.toLowerCase();
      if (query.includes('find') || query.includes('search') || query.includes('show') || query.includes('attractions')) {
        intent = 'SEARCH_DESTINATION';
      } else if (query.includes('near') || query.includes('nearby') || query.includes('around')) {
        intent = 'FIND_NEARBY';
      } else if (query.includes('tell me about') || query.includes('details') || query.includes('information')) {
        intent = 'GET_DETAILS';
      } else if (query.includes('plan') || query.includes('itinerary') || query.includes('trip')) {
        intent = 'PLAN_TRIP';
      }

      console.log('🎯 [PLANNER] Detected intent:', intent);

      return {
        intent,
        messages: [new AIMessage(content)],
      };
    } catch (error) {
      console.error('Planner node error:', error);
      return {
        error: 'Failed to analyze your request. Please try again.',
      };
    }
  }

  /**
   * Tool Executor Node: Calls appropriate MCP tools based on intent
   */
  private async toolExecutorNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log('\n🔧 [TOOL EXECUTOR] Running tools for intent:', state.intent);
    try {
      const { intent, userQuery } = state;

      switch (intent) {
        case 'SEARCH_DESTINATION': {
          // Extract destination name from query
          const destination = this.extractDestination(userQuery);
          console.log(`🔍 [TOOL] Calling OpenTripMap API for: ${destination}`);
          
          const results = await openTripMapAPI.searchPlaces(destination, 10);
          console.log(`✅ [TOOL] Got ${results.length} results from API`);
          return { searchResults: results };
        }

        case 'FIND_NEARBY': {
          // For demo, use Eiffel Tower coordinates
          // In production, extract from user query or previous context
          console.log(`📍 Finding nearby attractions...`);
          
          const attractions = await openTripMapAPI.getNearbyAttractions(
            48.8584, // Eiffel Tower lat
            2.2945,  // Eiffel Tower lon
            5000,    // 5km radius
            10       // limit
          );
          return { nearbyAttractions: attractions };
        }

        case 'GET_DETAILS': {
          // For demo, get details of first search result
          // In production, extract place ID from context
          if (state.searchResults && state.searchResults.length > 0) {
            const placeId = state.searchResults[0].id;
            console.log(`📄 Getting details for place: ${placeId}`);
            
            const details = await openTripMapAPI.getEnrichedPlaceDetails(placeId);
            return { placeDetails: details };
          }
          return { error: 'No place found to get details for.' };
        }

        default:
          return {};
      }
    } catch (error) {
      console.error('Tool executor error:', error);
      return {
        error: 'Failed to fetch travel information. Please try again.',
      };
    }
  }

  /**
   * Response Formatter Node: Creates conversational response from tool results
   */
  private async responseFormatterNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log('\n✍️  [FORMATTER] Generating response...');
    try {
      const { intent, searchResults, nearbyAttractions, placeDetails, error } = state;

      // Handle errors
      if (error) {
        return { response: `I apologize, but ${error}` };
      }

      // Format response based on what data we have
      let formattedResponse = '';

      if (searchResults && searchResults.length > 0) {
        formattedResponse = this.formatSearchResults(searchResults);
      } else if (nearbyAttractions && nearbyAttractions.length > 0) {
        formattedResponse = this.formatNearbyAttractions(nearbyAttractions);
      } else if (placeDetails) {
        formattedResponse = this.formatPlaceDetails(placeDetails);
      } else {
        // No tool results, use LLM to generate conversational response
        const messages = [
          new SystemMessage(TRAVEL_AGENT_SYSTEM_PROMPT),
          new HumanMessage(state.userQuery),
        ];
        console.log('🤖 [FORMATTER] Calling GPT-4o-mini for conversational response...');
        const response = await this.model.invoke(messages);
        formattedResponse = response.content as string;
      }

      console.log('✅ [FORMATTER] Response generated successfully\n');
      return { response: formattedResponse };
    } catch (error) {
      console.error('Response formatter error:', error);
      return {
        response: 'I had trouble formatting the response. Please try asking again.',
      };
    }
  }

  /**
   * Helper: Extract destination name from user query
   */
  private extractDestination(query: string): string {
    const words = query.split(' ');
    
    // Pattern 1: "attractions in Paris", "things to do in Tokyo"
    const inIndex = words.findIndex(w => w.toLowerCase() === 'in');
    if (inIndex !== -1 && words[inIndex + 1]) {
      return words[inIndex + 1].replace(/[^a-zA-Z]/gi, '');
    }
    
    // Pattern 2: "visit Paris", "go to Barcelona"  
    const prepositions = ['to', 'at', 'near', 'around', 'visit'];
    for (let i = 0; i < words.length; i++) {
      if (prepositions.includes(words[i].toLowerCase()) && words[i + 1]) {
        const nextWord = words[i + 1].toLowerCase();
        // Skip common words like "do", "see", "the"
        if (!['do', 'see', 'the', 'a', 'an', 'some'].includes(nextWord)) {
          return words[i + 1].replace(/[^a-zA-Z]/gi, '');
        }
      }
    }
    
    // Pattern 3: Look for capitalized words (likely place names)
    const capitalized = query.match(/\b[A-Z][a-z]+\b/g);
    if (capitalized && capitalized.length > 0) {
      return capitalized[capitalized.length - 1];
    }
    
    // Fallback: return last word
    return words[words.length - 1].replace(/[^a-zA-Z]/gi, '');
  }

  /**
   * Helper: Format search results into readable text
   */
  private formatSearchResults(results: any[]): string {
    const count = results.length;
    let response = `I found ${count} amazing places! Here are the highlights:\n\n`;

    results.slice(0, 5).forEach((place, index) => {
      response += `${index + 1}. **${place.name}**\n`;
      response += `   📍 Location: ${place.location.latitude.toFixed(4)}, ${place.location.longitude.toFixed(4)}\n`;
      
      if (place.category && place.category.length > 0) {
        response += `   🏷️  Categories: ${place.category.slice(0, 3).join(', ')}\n`;
      }
      
      if (place.rating) {
        response += `   ⭐ Rating: ${place.rating}/7\n`;
      }
      
      response += '\n';
    });

    response += '\nWould you like more details about any of these places? Just let me know! 🗺️';
    return response;
  }

  /**
   * Helper: Format nearby attractions
   */
  private formatNearbyAttractions(attractions: any[]): string {
    let response = `Here's what I found nearby:\n\n`;

    attractions.slice(0, 5).forEach((place, index) => {
      response += `${index + 1}. **${place.name}**\n`;
      
      if (place.distance) {
        response += `   📏 Distance: ${place.distance}m\n`;
      }
      
      if (place.category && place.category.length > 0) {
        response += `   🏷️  ${place.category.slice(0, 2).join(', ')}\n`;
      }
      
      response += '\n';
    });

    response += '\nThese are all within walking distance! Want to add any to your itinerary? ✨';
    return response;
  }

  /**
   * Helper: Format place details
   */
  private formatPlaceDetails(details: any): string {
    let response = `# ${details.name}\n\n`;
    
    if (details.description) {
      response += `${details.description}\n\n`;
    }
    
    if (details.rating) {
      response += `⭐ **Rating**: ${details.rating}/7\n`;
    }
    
    if (details.category && details.category.length > 0) {
      response += `🏷️  **Categories**: ${details.category.join(', ')}\n`;
    }
    
    if (details.image) {
      response += `\n🖼️ [View Image](${details.image})\n`;
    }
    
    response += '\n\nWould you like to find nearby attractions or plan a visit? 🎒';
    return response;
  }

  /**
   * Main method: Process user query and return response
   */
  async chat(userQuery: string, conversationId?: string): Promise<string> {
    try {
      console.log(`\n🤖 Processing: "${userQuery}"\n`);

      const initialState: AgentState = {
        messages: [],
        userQuery,
        conversationId,
        timestamp: new Date(),
        intent: undefined,
        searchResults: undefined,
        nearbyAttractions: undefined,
        placeDetails: undefined,
        response: undefined,
        error: undefined,
      };

      // Run the graph
      const result = await this.graph.invoke(initialState);

      return result.response || 'I apologize, but I had trouble processing your request.';
    } catch (error) {
      console.error('Chat error:', error);
      return 'I encountered an error. Please try again.';
    }
  }
}

// Lazy singleton instance - only created when first accessed
let _travelAgentInstance: TravelAgent | null = null;

export function getTravelAgent(): TravelAgent {
  if (!_travelAgentInstance) {
    _travelAgentInstance = new TravelAgent({
      modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
    });
  }
  return _travelAgentInstance;
}

// For backward compatibility
export const travelAgent = new Proxy({} as TravelAgent, {
  get(target, prop) {
    return getTravelAgent()[prop as keyof TravelAgent];
  },
});
