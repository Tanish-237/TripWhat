#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { placesTools } from './tools.js';

/**
 * Places MCP Server
 * Provides tools for discovering travel destinations and attractions
 */
class PlacesServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'tripwhat-places-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handler for listing available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: placesTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(tool.inputSchema.shape).map(([key, value]: [string, any]) => [
                key,
                {
                  type: value._def.typeName === 'ZodString' ? 'string' : 'number',
                  description: value._def.description || '',
                },
              ])
            ),
            required: Object.keys(tool.inputSchema.shape).filter(
              (key) => !tool.inputSchema.shape[key].isOptional()
            ),
          },
        })),
      };
    });

    // Handler for tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Find the requested tool
      const tool = placesTools.find((t) => t.name === name);

      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        // Validate and execute
        const validatedArgs = tool.inputSchema.parse(args);
        const result = await tool.execute(validatedArgs);
        
        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('TripWhat Places MCP Server running on stdio');
  }
}

// Start the server
const server = new PlacesServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
