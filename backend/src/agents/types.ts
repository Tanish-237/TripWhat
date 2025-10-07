import { BaseMessage } from '@langchain/core/messages';
import type { Destination } from '../mcp-servers/places/types.js';

/**
 * Agent state that flows through the LangGraph workflow
 */
export interface AgentState {
  // User input and conversation history
  messages: BaseMessage[];
  
  // Current user query
  userQuery: string;
  
  // Detected intent
  intent?: 'SEARCH_DESTINATION' | 'GET_DETAILS' | 'FIND_NEARBY' | 'PLAN_TRIP' | 'CASUAL_CHAT' | 'REFINEMENT';
  
  // Tool call results
  searchResults?: Destination[];
  placeDetails?: any;
  nearbyAttractions?: Destination[];
  
  // Final response
  response?: string;
  
  // Error handling
  error?: string;
  
  // Metadata
  conversationId?: string;
  timestamp?: Date;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolName: string;
  input: any;
  output: any;
  error?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

/**
 * MCP server connection info
 */
export interface MCPConnection {
  serverName: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}
