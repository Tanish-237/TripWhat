# TripWhat

AI-powered travel planner with LangGraph agent orchestration, chat-first interface, and deferred itinerary generation.

## Quick start

```bash
# Backend (Python)
cd backend-python && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:asgi_app --reload --port 5000

# Frontend
cd frontend && npm install && npm run dev   # :5173
```

## Prerequisites

- Python 3.12+
- PostgreSQL (local or Docker)
- OpenAI API key

## Environment variables

**Backend** (`backend-python/.env`):
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/tripwhat
JWT_SECRET=...
OPENTRIPMAP_API_KEY=...
GOOGLE_PLACES_API_KEY=...
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
