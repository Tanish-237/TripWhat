# TripWhat

AI-first travel planner built with MERN stack, Model Context Protocol (MCP), and LangGraph agents.

## Architecture

```
tripwhat/
├── backend/
│   ├── src/
│   │   ├── agents/           # LangGraph agent orchestration
│   │   ├── mcp-servers/      # MCP server implementations
│   │   │   ├── flights/      # Amadeus API integration
│   │   │   ├── hotels/       # Hotel search & booking
│   │   │   ├── places/       # POIs and attractions
│   │   │   └── weather/      # Weather forecasts
│   │   ├── routes/           # Express routes
│   │   ├── models/           # MongoDB schemas
│   │   ├── services/         # Business logic
│   │   └── utils/            # Helpers
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/         # Chat interface
│   │   │   ├── Itinerary/    # Trip timeline view
│   │   │   ├── Map/          # Map with pins
│   │   │   └── Cards/        # Destination cards
│   │   ├── pages/
│   │   ├── services/         # API calls
│   │   ├── hooks/            # Custom React hooks
│   │   └── App.jsx
│   └── package.json
│
├── mcp-protocol/             # Shared MCP protocol definitions
└── docs/                     # Documentation

## Tech Stack

**Frontend**: React, TailwindCSS, Socket.io-client, Mapbox GL JS
**Backend**: Node.js, Express, Socket.io, LangGraph, MongoDB
**AI**: OpenAI GPT-4o-mini, MCP Protocol
**APIs**: Amadeus, OpenTripMap, OpenWeatherMap, Geoapify

## Setup

### Prerequisites
- Node.js 18+
- MongoDB
- OpenAI API key
- Amadeus API key (free tier)

### Installation

```bash
# Clone repository
git clone https://github.com/Tanish-237/TripWhat.git
cd TripWhat

# Backend setup
cd backend
npm install
cp .env.example .env
# Add API keys to .env

# Frontend setup
cd ../frontend
npm install
cp .env.example .env

# Start MongoDB
mongod

# Run backend (from backend/)
npm run dev

# Run frontend (from frontend/)
npm run dev
```

## Environment Variables

**Backend (.env)**:
```
OPENAI_API_KEY=your_key
AMADEUS_API_KEY=your_key
AMADEUS_API_SECRET=your_secret
MONGODB_URI=mongodb://localhost:27017/tripwhat
PORT=5000
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:5000
VITE_MAPBOX_TOKEN=your_token
```

## Features

- Chat-based trip planning
- AI agent with MCP tool integration
- Structured itinerary output
- Interactive map with destination pins
- Swipeable destination cards
- Multi-turn conversation refinement
- Booking affiliate links

## Development roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for detailed feature breakdown.
