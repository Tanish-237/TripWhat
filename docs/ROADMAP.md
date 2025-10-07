# TripWhat Development Roadmap

**Approach**: Page-by-page full-stack development with MCP-first architecture.

---

## 🎯 Phase 0: Foundation (Week 1)

### Step 0.1: Project Setup
**Time**: 1 day

**Backend**:
- Initialize Node.js project with Express
- Install dependencies: `express`, `mongoose`, `socket.io`, `@modelcontextprotocol/sdk`, `@langchain/core`, `@langchain/langgraph`, `openai`, `dotenv`
- Set up TypeScript configuration
- Configure MongoDB connection
- Set up environment variables

**Frontend**:
- Initialize Vite React project
- Install: `react`, `tailwindcss`, `socket.io-client`, `axios`, `mapbox-gl`, `framer-motion`, `lucide-react`
- Configure Tailwind CSS
- Set up folder structure

**Deliverable**: Empty projects with proper structure, running dev servers.

---

### Step 0.2: Build First MCP Server (Places)
**Time**: 2 days

**Why Places First?**: Simplest API, no auth complexity, good for learning MCP.

**File**: `backend/src/mcp-servers/places/server.ts`

**Implement**:
```typescript
// MCP Server exposing tools:
// 1. searchDestinations(query: string) - OpenTripMap API
// 2. getPlaceDetails(placeId: string) - OpenTripMap + Google Places
// 3. getNearbyAttractions(lat, lng, radius) - OpenTripMap

// Use @modelcontextprotocol/sdk
// Expose via stdio transport
```

**Test with MCP Inspector**:
```bash
npx @modelcontextprotocol/inspector node places/server.js
```

**Deliverable**: Working MCP server that returns tourist attractions.

---

### Step 0.3: Basic LangGraph Agent
**Time**: 2 days

**File**: `backend/src/agents/travel-agent.ts`

**Implement**:
```typescript
// Simple LangGraph workflow:
// 1. User input → Planner node (GPT-4o-mini)
// 2. Planner decides which MCP tools to call
// 3. Tool executor node calls MCP server
// 4. Response formatter node creates JSON output
// 5. Return to frontend

// Connect to Places MCP server via stdio
// Use LangGraph StateGraph
```

**Test**: Command-line test script that sends "Show me attractions in Paris" and gets structured response.

**Deliverable**: Agent that can query Places MCP server and return results.

---

## 📄 Phase 1: Chat Interface (Week 2)

### Feature: Chat-Based Trip Planning

**User Story**: "As a user, I can type 'Plan a 3-day trip to Barcelona' and get a conversational response with suggestions."

---

#### Backend (2 days)

**File**: `backend/src/routes/chat.ts`

```typescript
// POST /api/chat
// Body: { message: string, conversationId?: string }
// 
// 1. Load/create conversation from MongoDB
// 2. Invoke LangGraph agent with message
// 3. Stream response via Socket.io
// 4. Save conversation state
// 5. Return initial response + conversationId
```

**File**: `backend/src/models/Conversation.ts`

```typescript
// MongoDB schema:
// - conversationId
// - messages: [{ role, content, timestamp }]
// - metadata: { destination, dates, budget }
// - createdAt, updatedAt
```

**Socket.io Integration**:
```typescript
// Real-time streaming of agent thoughts and tool calls
io.on('connection', (socket) => {
  socket.on('send-message', async (data) => {
    // Stream agent progress:
    // - "Searching destinations..."
    // - "Found 5 attractions..."
    // - "Generating itinerary..."
  });
});
```

---

#### Frontend (2 days)

**File**: `frontend/src/pages/Chat.jsx`

**UI Components**:
- Message input box (bottom)
- Message list (scrollable)
- Typing indicator
- Suggested prompts ("Plan a trip to...", "Show me beach destinations")

**File**: `frontend/src/components/Chat/MessageBubble.jsx`
- User messages (right, blue)
- AI messages (left, gray)
- Loading skeleton

**File**: `frontend/src/components/Chat/TypingIndicator.jsx`
- Animated dots while agent is thinking

**Socket.io Client**:
```javascript
// Connect to backend
// Listen for agent progress updates
// Display streaming responses
```

**Styling**: Modern chat UI inspired by ChatGPT (dark mode, clean bubbles, smooth animations).

---

#### Integration (1 day)

**Test Flow**:
1. User types: "Plan a 5-day trip to Japan"
2. Backend agent calls Places MCP server
3. Backend streams progress: "Searching Japanese attractions..."
4. Backend returns: "Here's a 5-day itinerary for Japan: Day 1..."
5. Frontend displays message in chat

**Deliverable**: Working chat interface with AI responses using Places MCP server.

---

## 🗓️ Phase 2: Itinerary View (Week 3)

### Feature: Structured Itinerary Display

**User Story**: "After chatting, I see my trip broken down by days, times, and places in a clean timeline view."

---

#### Backend (2 days)

**Add Hotels MCP Server**:

**File**: `backend/src/mcp-servers/hotels/server.ts`

```typescript
// Tools:
// 1. searchHotels(destination, checkIn, checkOut, guests)
//    - Use Amadeus Hotel Search API (free tier)
//    - Fallback: Web scraping Booking.com
// 2. getHotelDetails(hotelId)
// 3. getHotelReviews(hotelId)

// Expose via MCP stdio
```

**Update Agent to Generate Structured Itinerary**:

**File**: `backend/src/agents/travel-agent.ts`

```typescript
// Add "itinerary_generator" node
// Output format:
{
  destination: "Barcelona",
  dates: { start: "2024-06-15", end: "2024-06-18" },
  days: [
    {
      day: 1,
      date: "2024-06-15",
      activities: [
        {
          time: "09:00",
          title: "Visit Sagrada Familia",
          description: "...",
          location: { lat: 41.4036, lng: 2.1744 },
          duration: "2 hours",
          type: "attraction"
        },
        { time: "13:00", title: "Lunch at...", type: "meal" },
        ...
      ]
    },
    ...
  ],
  hotel: {
    name: "Hotel Barcelona",
    location: {...},
    price: "$120/night",
    bookingLink: "https://..."
  }
}
```

**API Endpoint**:
```typescript
// GET /api/itinerary/:conversationId
// Returns structured itinerary JSON
```

---

#### Frontend (3 days)

**File**: `frontend/src/pages/Itinerary.jsx`

**Layout**:
```
┌────────────────────────────────────┐
│  Barcelona Trip • Jun 15-18        │
│  [$480 total] [Export] [Share]    │
├────────────────────────────────────┤
│  📅 Day 1 - June 15                │
│  ┌─────────────────────────────┐  │
│  │ 09:00 Sagrada Familia       │  │
│  │ Duration: 2h | Attraction   │  │
│  │ [View on Map]               │  │
│  └─────────────────────────────┘  │
│  ┌─────────────────────────────┐  │
│  │ 13:00 Lunch at La Rambla    │  │
│  └─────────────────────────────┘  │
│  ...                               │
│  📅 Day 2 - June 16                │
│  ...                               │
└────────────────────────────────────┘
```

**Components**:
- `ItineraryHeader.jsx`: Trip summary, dates, budget
- `DayCard.jsx`: Collapsible day sections
- `ActivityCard.jsx`: Individual activity with time, icon, details
- `HotelCard.jsx`: Accommodation info with booking link

**Features**:
- Click activity → highlight on map (prepare for Phase 3)
- Smooth scroll animations (Framer Motion)
- Print/export itinerary as PDF
- Edit mode (future: drag-reorder activities)

**Styling**: Card-based layout, modern travel app aesthetic (think Airbnb/Booking.com).

---

#### Integration (1 day)

**Test Flow**:
1. User completes chat: "Plan a 3-day Barcelona trip"
2. Agent generates structured itinerary using Places + Hotels MCP servers
3. User clicks "View Itinerary" button in chat
4. Navigate to `/itinerary/:conversationId`
5. Display timeline with day-by-day breakdown

**Deliverable**: Beautiful itinerary view showing structured trip plan.

---

## 🗺️ Phase 3: Map Integration (Week 4)

### Feature: Interactive Map with Destination Pins

**User Story**: "I see all my trip locations on an interactive map with pins I can click for details."

---

#### Backend (1 day)

**Add Weather MCP Server**:

**File**: `backend/src/mcp-servers/weather/server.ts`

```typescript
// Tools:
// 1. getForecast(lat, lng, date)
//    - OpenWeatherMap API (free)
// 2. getClimateInfo(location, month)

// Add weather to itinerary response
```

**Update Itinerary Endpoint**:
```typescript
// GET /api/itinerary/:conversationId
// Add geoJSON format for Mapbox:
{
  ...itinerary,
  mapData: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [2.1744, 41.4036] },
        properties: {
          title: "Sagrada Familia",
          description: "...",
          day: 1,
          time: "09:00"
        }
      },
      ...
    ]
  }
}
```

---

#### Frontend (3 days)

**File**: `frontend/src/components/Map/TripMap.jsx`

**Implement Mapbox GL JS**:
```javascript
// 1. Initialize map centered on destination
// 2. Add pins for each activity
// 3. Cluster nearby pins
// 4. Draw route lines between activities (day by day)
// 5. Click pin → show popup with activity details
// 6. Click popup → scroll itinerary to that activity
```

**Pin Types**:
- 🏛️ Attractions (red)
- 🏨 Hotel (blue)
- 🍴 Restaurants (orange)
- ✈️ Airport (green)

**Features**:
- Zoom to specific day
- Toggle day visibility
- 3D terrain mode (optional)
- Weather overlay (show forecast on pins)

**File**: `frontend/src/components/Map/MapPopup.jsx`
```javascript
// Popup content:
// - Activity name
// - Time
// - Brief description
// - Weather for that time
// - [View Details] button
```

---

#### Integration (1 day)

**Layout Update**: Split-screen on desktop

```
┌─────────────────┬──────────────────┐
│   Itinerary     │      Map         │
│   (scrollable)  │   (interactive)  │
│                 │                  │
│   Day 1         │      🗺️          │
│   - 09:00 ...   │    📍 📍         │
│   - 13:00 ...   │      📍          │
│                 │    📍            │
└─────────────────┴──────────────────┘
```

**Mobile**: Tabs (Itinerary / Map)

**Sync**: Click activity in itinerary → map zooms to pin. Click pin → itinerary scrolls to activity.

**Deliverable**: Interactive map showing all trip locations with weather data.

---

## 🎴 Phase 4: Destination Cards (Week 5)

### Feature: Swipeable Destination Discovery

**User Story**: "Before planning, I browse destination cards and swipe through options to get inspired."

---

#### Backend (2 days)

**File**: `backend/src/agents/discovery-agent.ts`

**New Agent**: Destination Recommender
```typescript
// Input: { interests: [], budget: string, season: string, duration: number }
// Output: [
//   {
//     destination: "Bosnia and Herzegovina",
//     tagline: "Hidden Balkan gem with Ottoman heritage",
//     highlights: ["Mostar Bridge", "Sarajevo Old Town", "Kravice Falls"],
//     bestTime: "May-September",
//     avgBudget: "$50/day",
//     image: "url",
//     whyGo: "...",
//     activities: ["hiking", "history", "food"],
//     flightPrice: "$450 (estimated)"
//   },
//   ...
// ]

// Use Places MCP + flight price estimation
```

**API Endpoint**:
```typescript
// POST /api/discover
// Body: { interests, budget, season, travelers }
// Returns: Array of destination cards
```

---

#### Frontend (3 days)

**File**: `frontend/src/pages/Discover.jsx`

**UI**: Tinder-style card deck
```
┌────────────────────────────────┐
│        Card Stack              │
│  ┌──────────────────────────┐ │
│  │  📸 Bosnia Image         │ │
│  │                          │ │
│  │  Bosnia and Herzegovina  │ │
│  │  "Hidden Balkan gem"     │ │
│  │                          │ │
│  │  🏔️ Mostar • 🍽️ Food    │ │
│  │  $50/day                 │ │
│  │                          │ │
│  │  [← Skip]  [❤️ Save]    │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

**Libraries**:
- `react-tinder-card` or `framer-motion` for swipe gestures
- Lazy load images

**Features**:
- Swipe left: Skip
- Swipe right: Save to "Liked Destinations"
- Tap card: Expand details modal
- After swiping: "Plan a trip to [destination]" button

**File**: `frontend/src/components/Cards/DestinationCard.jsx`
```javascript
// Card with:
// - Hero image (high quality)
// - Destination name
// - Tagline
// - Key stats (budget, best time)
// - Activity tags
// - CTA button
```

---

#### Integration (1 day)

**Flow**:
1. Homepage → "Discover Destinations" button
2. Answer quick questions (interests: [beach, adventure, food], budget: medium, when: summer)
3. Agent generates 10 personalized cards
4. User swipes through cards
5. Click "Plan trip to Montenegro" → Navigate to chat with pre-filled message

**Deliverable**: Beautiful card-based destination discovery with AI recommendations.

---

## 🔄 Phase 5: Multi-turn Refinement & Booking (Week 6)

### Feature: Iterative Trip Editing + Booking Links

**User Story**: "I can tell the AI 'make it cheaper' or 'add a day in Dubrovnik' and my trip updates instantly."

---

#### Backend (3 days)

**Add Flights MCP Server**:

**File**: `backend/src/mcp-servers/flights/server.ts`

```typescript
// Tools:
// 1. searchFlights(origin, destination, date, passengers)
//    - Amadeus Flight Offers Search API
// 2. getFlightPrice(flightId)
// 3. getAirportInfo(code)

// Return affiliate links to Skyscanner/Google Flights
```

**Update Travel Agent with Refinement Logic**:

**File**: `backend/src/agents/travel-agent.ts`

```typescript
// Add nodes:
// 1. "intent_classifier" - Detect refinement type:
//    - Budget adjustment ("make it cheaper")
//    - Duration change ("add 2 days")
//    - Location addition ("add Prague")
//    - Activity swap ("replace museum with beach")
// 
// 2. "itinerary_updater" - Modify existing itinerary based on intent
// 
// 3. Use conversation history to maintain context
```

**API Endpoints**:
```typescript
// POST /api/chat/refine
// Body: { conversationId, refinementRequest }
// Updates existing itinerary, returns diff

// GET /api/booking-links/:conversationId
// Returns: { flights, hotels, activities } with affiliate URLs
```

---

#### Frontend (2 days)

**Update Chat Interface**:

**File**: `frontend/src/components/Chat/RefinementSuggestions.jsx`

**Quick Actions** (buttons below chat input):
- "Make it cheaper 💰"
- "Add 1 day ➕"
- "Show luxury options 👑"
- "Remove [activity] ✂️"

**Itinerary Comparison View**:
```
Old Itinerary       →    New Itinerary
Day 1: Museum            Day 1: Beach ✨ (changed)
Day 2: Castle            Day 2: Castle
                         Day 3: Market ✨ (added)
```

**File**: `frontend/src/components/Itinerary/BookingPanel.jsx`

**Booking Links UI**:
```
┌────────────────────────────────┐
│  Ready to Book?                │
│  ┌──────────────────────────┐ │
│  │ ✈️ Flights                │ │
│  │ NYC → Barcelona           │ │
│  │ $450 round-trip           │ │
│  │ [View on Skyscanner] →   │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ 🏨 Hotel Barcelona        │ │
│  │ 3 nights • $360 total     │ │
│  │ [View on Booking.com] → │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

---

#### Integration (1 day)

**Test Refinement Flow**:
1. User has Barcelona itinerary
2. User: "Make it cheaper"
3. Agent: Searches cheaper hotels, removes expensive activities, re-generates
4. UI shows old vs. new side-by-side
5. User: "Perfect! Show booking links"
6. Booking panel appears with affiliate links

**Deliverable**: Full refinement capability + booking link generation.

---

## 🎨 Phase 6: Polish & Features (Week 7)

### Additional Features

**1. User Accounts** (2 days)
- JWT authentication
- Save trips to MongoDB
- View past trips
- Share trips via link

**2. Mobile Responsive** (1 day)
- Mobile-first chat UI
- Touch-friendly itinerary cards
- Map gestures

**3. Export & Share** (1 day)
- Export itinerary as PDF
- Share via link (public itineraries)
- Add to Google Calendar

**4. Caching & Performance** (1 day)
- Redis for API response caching
- Debounce search queries
- Optimize map rendering
- Lazy load images

**5. Error Handling** (1 day)
- Graceful API failures
- Fallback responses when MCP servers fail
- User-friendly error messages

---

## 📊 Testing & Deployment (Week 8)

**1. Testing** (2 days)
- Unit tests for MCP servers
- Integration tests for agent workflows
- E2E tests (Playwright) for critical flows
- Load testing (simulate 100 concurrent users)

**2. Deployment** (2 days)
- **Frontend**: Vercel (free)
- **Backend**: Railway.app or Render (free tier)
- **MongoDB**: MongoDB Atlas (free M0 cluster)
- **Redis**: Upstash (free 10K requests/day)

**3. Monitoring** (1 day)
- Sentry for error tracking
- PostHog for analytics
- Log LLM costs per user

---

## 🚀 Launch Checklist

- [ ] All MCP servers working (Places, Hotels, Weather, Flights)
- [ ] LangGraph agent handles complex queries
- [ ] Chat interface is smooth and responsive
- [ ] Itinerary displays correctly on mobile + desktop
- [ ] Map pins and routing work
- [ ] Destination cards load fast
- [ ] Refinement updates itinerary correctly
- [ ] Booking links generate properly
- [ ] Error handling covers edge cases
- [ ] Performance is acceptable (<3s response time)
- [ ] Cost monitoring in place
- [ ] Legal: Privacy policy, ToS, affiliate disclosures

---

## 💰 Estimated Costs (First Month, 100 Users)

| Item | Cost |
|------|------|
| OpenAI GPT-4o-mini | $20 |
| Amadeus API | Free (2K calls) |
| MongoDB Atlas | Free (M0) |
| Redis (Upstash) | Free |
| Mapbox | Free (50K loads) |
| Google Places | $50 (with $200 credit) |
| Hosting (Render) | $7/month (free tier + one paid) |
| **Total** | **$27-77** |

**Scaling**: At 1,000 users: ~$200-300/month.

---

## 🎯 Success Metrics

- **Week 2**: Chat works with Places MCP
- **Week 3**: Itinerary displays with Hotels MCP
- **Week 4**: Map shows all pins with Weather MCP
- **Week 5**: Cards generate personalized recommendations
- **Week 6**: Full refinement + booking links with Flights MCP
- **Week 8**: Deployed and live with 10 beta users

---

**Next Steps**: Which phase would you like to start with? I recommend beginning with Phase 0 (Foundation) to set up the project structure and first MCP server.
