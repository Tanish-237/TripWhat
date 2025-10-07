# 🤖 Travel Planning Agent (LangGraph)

## Overview

This directory contains the AI agent that orchestrates travel planning using **LangGraph** workflows. The agent connects to MCP servers (like the Places server) to search for destinations, get details, and help users plan trips.

## Architecture

```
┌─────────────┐
│ User Query  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   PLANNER       │  ← Analyzes intent using GPT-4o-mini
│  (LangGraph)    │    Decides which tools to call
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │  Intent │
    └────┬────┘
         │
    ┌────▼────────────────┐
    │  TOOL EXECUTOR      │
    │                     │
    │  • Search Places    │ ← Calls MCP servers
    │  • Get Details      │   (via API client)
    │  • Find Nearby      │
    └────────┬────────────┘
             │
             ▼
    ┌────────────────┐
    │  FORMATTER     │ ← Converts data to
    │                │   conversational text
    └───────┬────────┘
            │
            ▼
    ┌───────────────┐
    │  Response     │
    └───────────────┘
```

## Files

### `travel-agent.ts`
Main agent implementation using LangGraph StateGraph.

**Key Components:**
- **TravelAgent class**: Orchestrates the workflow
- **Planner node**: Analyzes user intent
- **Tool executor node**: Calls MCP tools
- **Response formatter node**: Creates conversational responses

**LangGraph Features Used:**
- `StateGraph`: Defines workflow states
- Conditional edges: Routes based on intent
- Node binding: Connects functions to graph nodes

### `types.ts`
TypeScript interfaces for agent state and configuration.

**Key Types:**
- `AgentState`: Data flowing through the graph
- `AgentConfig`: Model configuration
- `ToolResult`: Tool execution results

### `prompts.ts`
System prompts for the AI agent.

**Prompts:**
- `TRAVEL_AGENT_SYSTEM_PROMPT`: Main agent personality and instructions
- `INTENT_CLASSIFIER_PROMPT`: Intent detection guidance
- `RESPONSE_FORMATTER_PROMPT`: Response formatting rules

### `test-agent.ts`
Test script to verify agent functionality.

## Usage

### Basic Example

```typescript
import { travelAgent } from './agents/travel-agent.js';

// Simple query
const response = await travelAgent.chat('Show me attractions in Paris');
console.log(response);
```

### With Conversation ID

```typescript
const conversationId = 'user-123-conv-456';
const response = await travelAgent.chat(
  'What else is nearby?',
  conversationId
);
```

## Testing

### Run Test Script

```bash
# Make sure .env has OPENAI_API_KEY set
cd backend
npm run test:agent
```

**Expected Output:**
```
============================================================
🤖 Travel Agent - Interactive Tests
============================================================

============================================================
📝 User Query: "Show me attractions in Paris"
============================================================

🤖 Processing: "Show me attractions in Paris"

🔍 Searching for: Paris

🤖 Agent Response:
------------------------------------------------------------
I found 5 amazing places! Here are the highlights:

1. **Point zéro des routes de France**
   📍 Location: 48.8533, 2.3489
   🏷️  Categories: milestones, historic, monuments_and_memorials
   ⭐ Rating: 3/7

...

Would you like more details about any of these places? Just let me know! 🗺️
------------------------------------------------------------
```

### Manual Testing

```typescript
// Create your own test
import { travelAgent } from './agents/travel-agent.js';

const response = await travelAgent.chat('Find beaches in Bali');
console.log(response);
```

## How It Works

### 1. Planner Node

```typescript
// Analyzes user query
"Show me attractions in Paris"
   ↓
Intent: SEARCH_DESTINATION
   ↓
Routes to Tool Executor
```

**Intent Detection:**
- Keywords: "show", "find", "search" → SEARCH_DESTINATION
- Keywords: "nearby", "near", "around" → FIND_NEARBY
- Keywords: "details", "tell me about" → GET_DETAILS

### 2. Tool Executor Node

```typescript
// Calls appropriate MCP tool
SEARCH_DESTINATION → openTripMapAPI.searchPlaces(destination)
FIND_NEARBY → openTripMapAPI.getNearbyAttractions(lat, lon)
GET_DETAILS → openTripMapAPI.getEnrichedPlaceDetails(placeId)
```

### 3. Response Formatter Node

```typescript
// Converts API data to natural language
{
  "name": "Eiffel Tower",
  "location": { lat: 48.8584, lon: 2.2945 },
  "category": ["towers", "attractions"]
}
   ↓
"The Eiffel Tower is an iconic attraction located at 48.8584, 2.2945.
 It's categorized as a tower and major tourist attraction..."
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (for Places MCP)
OPENTRIPMAP_API_KEY=5ae2e3f22...

# Model Selection
OPENAI_MODEL=gpt-4o-mini  # or gpt-4, gpt-3.5-turbo
```

### Agent Config

```typescript
import { TravelAgent } from './travel-agent.js';

const agent = new TravelAgent({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,        // Creativity (0-1)
  maxTokens: 1000,         // Max response length
  streaming: false,        // Enable streaming responses
});
```

## Extending the Agent

### Add New Intents

1. **Update types.ts:**
```typescript
export interface AgentState {
  intent?: 'SEARCH_DESTINATION' | 'GET_DETAILS' | 'FIND_NEARBY' | 'YOUR_NEW_INTENT';
}
```

2. **Update planner node in travel-agent.ts:**
```typescript
if (query.includes('your_keyword')) {
  intent = 'YOUR_NEW_INTENT';
}
```

3. **Add case in tool executor:**
```typescript
case 'YOUR_NEW_INTENT': {
  // Your tool logic
  const results = await someAPI.someMethod();
  return { yourResults: results };
}
```

### Connect New MCP Servers

```typescript
// Example: Adding Hotels MCP
import { hotelsMCP } from '../mcp-servers/hotels/api.js';

case 'SEARCH_HOTELS': {
  const hotels = await hotelsMCP.searchHotels(destination, dates);
  return { hotels };
}
```

## Performance

- **Average response time**: 2-4 seconds
- **LLM calls per query**: 1-2 (planner + optional formatter)
- **Cost per query**: ~$0.001-0.003 (with GPT-4o-mini)

## Troubleshooting

### Agent not responding

Check:
1. `OPENAI_API_KEY` is set in `.env`
2. OpenAI API has credits
3. No rate limiting errors in logs

### Wrong tool being called

The intent detection is keyword-based (simple). To improve:
- Use GPT for intent classification
- Add more keywords to `plannerNode()`
- Use function calling instead of conditionals

### Tools returning empty results

Check:
1. `OPENTRIPMAP_API_KEY` is valid
2. Place names are spelled correctly
3. API is not rate limited

## Next Steps

1. **Add conversation memory** - Remember previous queries
2. **Improve intent detection** - Use GPT function calling
3. **Add more MCP servers** - Hotels, Flights, Weather
4. **Enable streaming** - Real-time response updates
5. **Add persistence** - Save conversations to MongoDB

## Related Files

- **MCP Servers**: `../mcp-servers/places/`
- **API Clients**: `../mcp-servers/places/api.ts`
- **Main Server**: `../server.ts`

---

**Phase Status**: ✅ Phase 0.3 Complete - LangGraph agent working with Places MCP!

**Next Phase**: Phase 1 - Chat Interface with Socket.io streaming
