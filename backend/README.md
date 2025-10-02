# TripWhat Backend

AI-powered travel planner backend with Model Context Protocol (MCP) servers and LangGraph agents.

## Quick Start

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your API keys to .env

# Run main server
npm run dev

# Run Places MCP server (standalone)
npm run mcp:places
```

## Architecture

```
backend/
├── src/
│   ├── server.ts              # Main Express server
│   ├── config/                # Database & configs
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes (coming in Phase 1)
│   ├── agents/                # LangGraph agents (coming in Phase 0.3)
│   ├── mcp-servers/           # MCP Servers
│   │   ├── places/            # ✅ Places MCP Server
│   │   ├── hotels/            # (Phase 2)
│   │   ├── weather/           # (Phase 3)
│   │   └── flights/           # (Phase 5)
│   ├── services/              # Business logic
│   └── utils/                 # Utilities
```

## MCP Servers

### Places Server (OpenTripMap)

Provides tools for discovering destinations and attractions.

**Tools**:
1. `search_destinations` - Search for places by name
2. `get_place_details` - Get detailed info about a place
3. `get_nearby_attractions` - Find attractions near coordinates

**Run standalone**:
```bash
npm run mcp:places
```

**Test manually**:
```bash
tsx src/mcp-servers/places/test-manual.ts
```

**Test with MCP Inspector**:
```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Test the server
npx @modelcontextprotocol/inspector tsx src/mcp-servers/places/server.ts
```

#### Example Tool Usage

**Search Destinations**:
```json
{
  "tool": "search_destinations",
  "arguments": {
    "query": "Paris",
    "limit": 10
  }
}
```

**Get Place Details**:
```json
{
  "tool": "get_place_details",
  "arguments": {
    "placeId": "Q243"
  }
}
```

**Get Nearby Attractions**:
```json
{
  "tool": "get_nearby_attractions",
  "arguments": {
    "latitude": 48.8584,
    "longitude": 2.2945,
    "radius": 3000,
    "limit": 20
  }
}
```

## Development

### Running the Main Server

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build
npm start
```

### Environment Variables

See `.env.example` for all required variables. Key ones:

- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key (for agents in Phase 0.3)
- `PORT` - Server port (default: 5000)

### MongoDB Setup

**Option 1: Local MongoDB**
```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb
sudo systemctl start mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

**Option 2: MongoDB Atlas (Free Cloud)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Get connection string
4. Add to `.env` as `MONGODB_URI`

### Testing

```bash
# Run all tests
npm test

# Test specific MCP server
tsx src/mcp-servers/places/test-manual.ts
```

## API Endpoints

### Current Endpoints (Phase 0.1)

- `GET /health` - Health check
- `GET /api` - API status

### Coming Soon (Phase 1+)

- `POST /api/chat` - Send chat message
- `GET /api/itinerary/:id` - Get itinerary
- `POST /api/discover` - Get destination recommendations

## MCP Server Development Guide

### Creating a New MCP Server

1. Create directory: `src/mcp-servers/<name>/`
2. Add files:
   - `types.ts` - TypeScript interfaces
   - `api.ts` - External API client
   - `tools.ts` - MCP tool definitions
   - `server.ts` - MCP server implementation
   - `test-manual.ts` - Manual tests

3. Add script to `package.json`:
```json
{
  "scripts": {
    "mcp:<name>": "tsx src/mcp-servers/<name>/server.ts"
  }
}
```

4. Test with MCP Inspector:
```bash
npx @modelcontextprotocol/inspector tsx src/mcp-servers/<name>/server.ts
```

### MCP Tool Best Practices

- **Input validation**: Use Zod schemas
- **Error handling**: Return structured errors
- **Rate limiting**: Respect API limits
- **Caching**: Cache responses when appropriate
- **Testing**: Write manual tests for each tool

## Next Steps

- **Phase 0.3**: Build LangGraph agent to orchestrate MCP tools
- **Phase 1**: Add chat routes and Socket.io handlers
- **Phase 2**: Build Hotels MCP server

See [ROADMAP.md](../docs/ROADMAP.md) for full development plan.

## Troubleshooting

### MCP Server Won't Start

- Check Node.js version (18+)
- Run `npm install` again
- Check for TypeScript errors: `npx tsc --noEmit`

### OpenTripMap API Errors

- API is free and doesn't require key for basic usage
- Rate limits are generous
- Check network connection
- Try with different queries

### MongoDB Connection Failed

- Make sure MongoDB is running: `ps aux | grep mongod`
- Check `MONGODB_URI` in `.env`
- For Atlas, check IP whitelist

## Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [OpenTripMap API](https://opentripmap.io/docs)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [OpenAI API](https://platform.openai.com/docs)
