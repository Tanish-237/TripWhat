# TripWhat

AI-powered travel planner with LangGraph agent orchestration, chat-first interface, and deferred itinerary generation.

## Quick start

```bash
# 1. Start Redis (required for resumable streaming)
brew services start redis          # macOS (Homebrew)
# or: redis-server --daemonize yes  # Linux

# 2. Backend (Python)
cd backend-python && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:asgi_app --reload --port 5000

# 3. Frontend
cd frontend && npm install && npm run dev   # :5173
```

## Prerequisites

- Python 3.12+
- Node 18+
- PostgreSQL (local or Docker)
- Redis 6+ (for resumable stream buffering)
- OpenAI API key

## Environment variables

**Backend** (`backend-python/.env`):
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/tripwhat
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
OPENTRIPMAP_API_KEY=...
GOOGLE_PLACES_API_KEY=...
GOOGLE_MCP_ACCESS_TOKEN=...
SERPAPI_API_KEY=...
PORT=5000
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=...
```

## Testing

```bash
cd backend-python && pytest    # unit + integration tests
cd frontend && npm test        # vitest + playwright e2e
```

## Architecture

- **Backend**: FastAPI + Socket.IO + LangGraph Python + PostgreSQL
- **Frontend**: React 18 + Vite + TailwindCSS + Zustand
- **Agent**: LangGraph `create_agent` with `InjectedState` tools for native state persistence
- **Inventory**: SerpApi (Google Flights + Google Hotels) behind a provider-agnostic interface
- **Streaming**: Redis stream buffering for resumable LLM streams — disconnects/refreshes mid-stream are recovered automatically

### Resumable streaming

Agent events (tokens, status, tripState, interrupts) are written to a Redis stream keyed by conversation ID before being relayed via Socket.IO. If the client disconnects (page refresh, tab switch, network drop), the agent continues running and buffering to Redis. On reconnect, the frontend replays missed events via `GET /api/chat/stream/{conversation_id}` before rejoining the Socket.IO room for live updates.

The Socket.IO connection persists across component unmounts — only explicit logout tears it down.
