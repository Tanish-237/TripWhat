# TripWhat

AI-powered travel planner with LangGraph agent orchestration, chat-first interface, and deferred itinerary generation.

## Quick start

```bash
# Backend
cd backend && npm install && npm run dev    # :5000

# Frontend
cd frontend && npm install && npm run dev   # :5173
```

## Prerequisites

- Node.js 24+ (see `.nvmrc`)
- MongoDB (local or Atlas)
- OpenAI API key

## Environment variables

**Backend** (`backend/.env`):
```
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb://localhost:27017/tripwhat
JWT_SECRET=...
OPENTRIPMAP_API_KEY=...
GOOGLE_PLACES_API_KEY=...
SERPAPI_API_KEY=...
INVENTORY_PROVIDER=serpapi
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
cd backend && npm test     # vitest unit + integration
cd frontend && npm test    # vitest + playwright e2e
```

## Architecture

See `docs/MODERNIZATION-PLAN.md` for the full architecture spec and phased execution plan.

- **Backend**: Express + Socket.io + LangGraph + MongoDB
- **Frontend**: React 18 + Vite + TailwindCSS + Zustand
- **Agent pipeline**: 8-node LangGraph graph (classify → resolve → slot-gate → route-propose → tool-executor → plan-editor → builder → formatter)
- **Inventory**: SerpApi (Google Flights + Google Hotels) behind a provider-agnostic interface
