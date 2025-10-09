# Phase 1.5 Enhancement Plan: Robust MCP Server with Enhanced Tools

## Overview
Enhance the MCP server with more comprehensive tools, LLM-based intent detection, and integration with multiple APIs for hotels, flights, web search, and enhanced location services.

## New Tools to Implement

### 1. **Hotels & Accommodations**
- `search_hotels` - Find hotels in a location
- `get_hotel_details` - Get detailed hotel information
- **API**: Use Booking.com API (via RapidAPI) or Hotels.com API

### 2. **Flights**
- `search_flights` - Find flight options between cities
- `get_flight_prices` - Compare flight prices
- **API**: Use Amadeus API or Skyscanner API

### 3. **Transportation**
- `calculate_distance` - Calculate distance between two points
- `get_directions` - Get routing information
- `find_transport_options` - Find buses, trains, etc.
- **API**: OpenRouteService or Google Maps Distance Matrix

### 4. **Web Search**
- `web_search` - Search the web for travel information
- `get_top_results` - Get top N results from Google
- **API**: SerpAPI or Brave Search API

### 5. **Enhanced OpenTripMap**
- `search_restaurants` - Find restaurants by cuisine type
- `search_by_category` - Comprehensive category search
- `get_place_ratings` - Get ratings and reviews
- `get_opening_hours` - Check if place is open

### 6. **Weather & Climate**
- `get_weather_forecast` - Get weather forecast for dates
- `get_best_time_to_visit` - Suggest best travel times
- **API**: OpenWeatherMap API

### 7. **Budget & Currency**
- `convert_currency` - Convert between currencies
- `estimate_daily_budget` - Estimate costs for destination
- **API**: ExchangeRate-API or CurrencyLayer

## LLM-Based Intent Detection

Instead of hardcoded keyword matching, use GPT to:
1. Understand user intent
2. Extract parameters (location, dates, preferences)
3. Decide which tools to call
4. Handle multi-step planning

### Intent Detection Flow
```
User Query → GPT (Intent Classifier) → Structured Output → Tool Selection → Execution
```

### Sample Intent Structure
```typescript
interface DetectedIntent {
  primary_intent: string;  // 'search_destination', 'plan_trip', 'book_hotel', etc.
  entities: {
    location?: string;
    destination?: string;
    dates?: { start: string; end: string };
    budget?: string;
    preferences?: string[];
    number_of_people?: number;
  };
  tools_to_call: string[];  // ['search_hotels', 'search_flights', 'get_weather']
  confidence: number;
}
```

## Implementation Steps

### Step 1: Install New Dependencies
```bash
npm install cheerio serpapi @amadeus/amadeus-node
npm install @types/cheerio --save-dev
```

### Step 2: Create New API Integrations
- `backend/src/mcp-servers/hotels/api.ts`
- `backend/src/mcp-servers/flights/api.ts`
- `backend/src/mcp-servers/transport/api.ts`
- `backend/src/mcp-servers/websearch/api.ts`

### Step 3: Create Enhanced Tools
- `backend/src/mcp-servers/hotels/tools.ts`
- `backend/src/mcp-servers/flights/tools.ts`
- `backend/src/mcp-servers/transport/tools.ts`
- `backend/src/mcp-servers/websearch/tools.ts`
- Enhanced `backend/src/mcp-servers/places/tools.ts`

### Step 4: LLM-Based Intent Detector
- `backend/src/agents/intent-detector.ts`
- Uses GPT-4o-mini with structured output
- Replaces hardcoded keyword matching

### Step 5: Unified Tool Registry
- `backend/src/agents/tool-registry.ts`
- Central registry of all available tools
- Dynamic tool selection based on intent

### Step 6: Enhanced Travel Agent
- Update `travel-agent.ts` to use new tools
- Better multi-step planning
- Context management across conversations

## API Keys Required

Add to `.env`:
```env
# Existing
OPENAI_API_KEY=...
OPENTRIPMAP_API_KEY=...

# New
RAPIDAPI_KEY=...           # For hotels/flights
SERPAPI_KEY=...            # For web search
OPENWEATHER_API_KEY=...    # For weather
EXCHANGERATE_API_KEY=...   # For currency
```

## Free API Alternatives

For development/testing without paid APIs:
- **Hotels**: Booking.com scraper (limited)
- **Flights**: Mock data or Amadeus free tier
- **Web Search**: Brave Search API (free tier)
- **Weather**: OpenWeatherMap (free tier)
- **Currency**: ExchangeRate-API (free tier)
- **Transport**: OpenRouteService (free tier)

## Testing Strategy

1. **Unit Tests**: Test each tool individually
2. **Integration Tests**: Test tool combinations
3. **Intent Tests**: Test LLM intent detection accuracy
4. **E2E Tests**: Full conversation flows

## Documentation Updates

1. Update `README.md` with new features
2. Create `docs/API_INTEGRATIONS.md`
3. Create `docs/TOOL_USAGE.md`
4. Update `ROADMAP.md` with Phase 1.5
5. Create `PHASE1.5-COMPLETE.md` when done

## Success Metrics

- ✅ 10+ tools available
- ✅ LLM-based intent detection >90% accuracy
- ✅ Multi-API integration working
- ✅ Better response quality
- ✅ Handle complex multi-step queries
- ✅ All existing functionality preserved

## Timeline

- **Day 1**: Setup APIs, install dependencies
- **Day 2**: Implement hotels & flights tools
- **Day 3**: Implement transport & web search
- **Day 4**: LLM intent detector
- **Day 5**: Integration & testing
- **Day 6**: Documentation & polish

---

**Status**: Planning Complete - Ready for Implementation
**Next**: Begin implementation of new tools and APIs
