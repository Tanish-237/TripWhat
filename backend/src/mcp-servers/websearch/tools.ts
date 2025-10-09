import { z } from 'zod';
import { webSearchAPI } from './api.js';

/**
 * Tool: Web Search
 * Search the web for travel-related information
 */
export const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for travel information, guides, tips, and recommendations. Use this when you need current information not available in other tools.',
  inputSchema: z.object({
    query: z.string().describe('The search query (e.g., "best time to visit Paris", "Tokyo food guide")'),
    numResults: z.number().optional().default(5).describe('Number of results to return (default: 5)'),
  }),
  execute: async (args: { query: string; numResults?: number }) => {
    try {
      const results = await webSearchAPI.searchWeb(args.query, args.numResults || 5);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              count: results.length,
              results: results.map(r => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet,
              })),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Web search failed', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Tool: Travel Tips Search
 * Get travel tips for a destination
 */
export const travelTipsSearchTool = {
  name: 'search_travel_tips',
  description: 'Find travel tips, local customs, and important information for a destination.',
  inputSchema: z.object({
    destination: z.string().describe('The destination to get travel tips for'),
  }),
  execute: async (args: { destination: string }) => {
    try {
      const results = await webSearchAPI.getTravelTips(args.destination);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              destination: args.destination,
              tips: results.map(r => ({
                title: r.title,
                snippet: r.snippet,
                source: r.link,
              })),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Failed to get travel tips', details: String(error) }),
          },
        ],
        isError: true,
      };
    }
  },
};

// Export all web search tools
export const webSearchTools = [
  webSearchTool,
  travelTipsSearchTool,
];
