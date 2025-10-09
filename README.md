# TripWhat 🌍✈️

AI-powered travel planner built with **Model Context Protocol (MCP)**, **LangGraph**, and intelligent agents. Now with **LLM-based intent detection** and **10+ integrated tools**!

## 🆕 What's New in Phase 1.5

- 🧠 **LLM-Based Intent Detection**: 90%+ accuracy vs keyword matching
- 🔧 **10+ Tools**: Web search, distance calculation, restaurant finder, and more
- 🌐 **Web Search**: Real-time travel information from the web
- 📏 **Smart Routing**: Calculate distances and multi-stop routes
- 🍽️ **Restaurant Search**: Find dining options by cuisine and location
- 📊 **Unified Tool Registry**: Easy to add new capabilities
- 🎯 **Better Understanding**: Handles natural language variations

[See Full Phase 1.5 Details](./docs/PHASE1.5-COMPLETE.md)

---

## Architecture

```
tripwhat/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── travel-agent.ts      # Main LangGraph agent
│   │   │   ├── intent-detector.ts   # 🆕 LLM-based intent detection
│   │   │   ├── tool-registry.ts     # 🆕 Unified tool management
│   │   │   └── prompts.ts
│   │   ├── mcp-servers/
│   │   │   ├── places/              # OpenTripMap integration (enhanced)
│   │   │   ├── websearch/           # 🆕 Web search tools
│   │   │   └── transport/           # 🆕 Distance & routing
│   │   ├── routes/           # Express routes
│   │   ├── models/           # MongoDB schemas
│   │   ├── services/         # Itinerary builder
│   │   └── controllers/      # Request handlers
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/         # Real-time chat interface
│   │   │   ├── Map/          # Interactive map with pins
│   │   │   └── ui/           # Reusable UI components
│   │   ├── pages/
│   │   │   ├── Chat.tsx      # Main chat page
│   │   │   ├── OnboardingPage.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── hooks/            # Custom React hooks
│   │   └── contexts/         # Auth & state management
│   └── package.json
│
└── docs/
    ├── PHASE1-COMPLETE.md
    ├── PHASE1.5-COMPLETE.md    # 🆕 Latest features
    ├── ROADMAP.md
    └── SETUP.md

## Tech Stack

**Frontend**: 
- React 18 + TypeScript
- TailwindCSS for styling
- Socket.io-client for real-time updates
- Axios for API calls

**Backend**: 
- Node.js + Express
- Socket.io for WebSocket
- LangGraph for agent orchestration
- MongoDB + Mongoose
- OpenAI GPT-4o-mini

**MCP Tools**:
- OpenTripMap (tourist attractions, POIs)
- OpenStreetMap (geocoding, no API key)
- DuckDuckGo (web search, no API key)
- Custom tools (distance, routing)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (Community Edition)
- OpenAI API key

### Installation

```bash
# Clone repository
git clone https://github.com/Tanish-237/TripWhat.git
cd TripWhat

# Backend setup
cd backend
npm install

# Create .env file
cp .env.example .env
# Add your API keys (see below)

# Frontend setup
cd ../frontend
npm install

# Create frontend .env
cp .env.example .env
```

### Environment Variables

**Backend (.env)**:
```env
# Required
OPENAI_API_KEY=sk-your-openai-key
MONGODB_URI=mongodb://localhost:27017/tripwhat
JWT_SECRET=your-secret-key

# Optional but recommended
OPENTRIPMAP_API_KEY=your-key  # Get free at https://opentripmap.io

# Server config
PORT=5000
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:5000
```

### Running the App

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Start frontend  
cd frontend
npm run dev
```

**Access the app**: http://localhost:5173

---

## ✨ Features

- Chat-based trip planning
- AI agent with MCP tool integration
- Structured itinerary output
- Interactive map with destination pins
- Swipeable destination cards
- Multi-turn conversation refinement
- Booking affiliate links

## Development roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for detailed feature breakdown.
