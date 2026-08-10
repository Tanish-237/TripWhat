# TripWhat Modernization — Master Implementation Plan

**Purpose:** This document is a complete, self-contained spec for modernizing TripWhat into a chat-primary, design-coherent travel planner. It is written so that an AI coding agent (or human) can implement it phase-by-phase **without further discovery or guessing**. Every deletion, move, and new file is specified with paths.

**Guiding product principle:** The chat is the primary interface. All trip edits are natural-language chat commands that mutate a single canonical trip state; every other view (map, itinerary, saved places, bookings) is a read-model projection of that state.

**Reference products:** Stardrift (stardrift.ai — trips dashboard + saved places + bookings) and TheTarzanWay (thetarzanway.com — guided onboarding, route proposal rendered on map, suggestion chips, "Confirm Route and Build Itinerary" commit step). Backend orchestration modeled on the 6-stage pipeline in `exfiltrated.txt`. Visual identity is NOT copied from either — we use the custom 'Digital Wellness' theme in Section 4.

**Second core principle:** chat-first with **deferred planning**. The app opens as a pure conversational assistant (like ChatGPT). Itinerary generation is an explicit, user-initiated step — the agent periodically offers a soft CTA ("Want me to turn this into a plan?") that the user can accept or dismiss ("just chatting for now"). Nothing is generated until the user opts in.

---

## 1. Current-State Audit

### 1.1 The #1 structural problem: TWO backends running side by side

| | Legacy server | TS server |
|---|---|---|
| Entry | `backend/server.js` (port **8080**) | `backend/src/server.ts` (port **5000**) |
| Started by | `npm start` | `npm run dev` (`tsx watch`) |
| Routes | `backend/routes/*.js` | `backend/src/routes/*.ts` |
| Controllers | `backend/controllers/*.js` | `backend/src/controllers/chatController.ts` |
| Models | `backend/models/*.js` (User, Trip, SavedTrip, TravelPlan) | `backend/src/models/*.ts` (User, Conversation, FlightCache) |
| Owns | auth, trips, saved-trips, places autocomplete, travel-data (Amadeus proxy), Google Calendar OAuth | Socket.io chat, LangGraph agent, itinerary generate/refine/modify, flights |
| DB connect | `backend/config/db.js` | `backend/src/config/database.ts` |

**Worse:** `src/server.ts` imports `savedTripRoutes` and `placesRoutes` from the *legacy* `backend/routes/` folder, so the two worlds are already entangled. The frontend splits traffic across both: `frontend/src/lib/api.js` → port 8080 (auth, saved trips, travel-data, calendar); `VITE_SOCKET_URL` → port 5000 (chat, itinerary, flights).

### 1.2 Backend duplication inventory

- **Three itinerary builders with overlapping jobs:**
  - `backend/src/services/itineraryBuilder.ts` (981 lines) — markdown itinerary generation used by the agent
  - `backend/src/services/enhancedItineraryBuilder.ts` (718 lines) — "with travel means" variant, used by `POST /api/itinerary/generate-with-travel`
  - `backend/src/services/itineraryService.ts` (442 lines) — itinerary *modification* ops (add/remove/replace/modify/move) + own `Itinerary` interfaces that **duplicate** `backend/src/types/itinerary.ts`
- **Two flight paths:** `backend/src/services/amadeusService.ts` (1453 lines) + `backend/src/routes/flights.ts` (141 lines) on the TS server, **and** `backend/controllers/travelDataController.js` (295 lines) + `backend/routes/travelDataRoutes.js` on the legacy server (also Amadeus).
- **⚠️ Amadeus is dead:** the Amadeus Self-Service API shut down on **2026-07-17** — every Amadeus-backed feature (flight search, hotel offers, airport autocomplete, flight inspiration) is currently broken. Full replacement in 3.4a. Amadeus touchpoints: `src/services/{amadeusService,flightService,travelMeansService,enhancedItineraryBuilder}.ts`, `src/routes/{flights,travel}.ts`, legacy `travelDataController.js`, `amadeus` npm dep, `AMADEUS_*` env vars.
- **Two places integrations:** `backend/src/mcp-servers/places/` (OpenTripMap, 4 files) + `backend/src/services/googlePlacesAPI.ts` (333 lines), **and** legacy `backend/services/placesService.js` + `backend/routes/placesRoutes.js`.
- **Two auth implementations:** `backend/src/routes/auth.ts` + `src/middleware/auth.ts` vs `backend/routes/authRoutes.js` + `backend/middleware/auth.js` + `backend/controllers/authController.js`.
- **Two User models** (`backend/models/User.js`, `backend/src/models/User.ts`) that will drift.
- **Dead weight:** `backend/src/agents/test-agent.ts`, `backend/src/mcp-servers/places/test-manual.ts`, `backend/test-hotel-search.js`, `backend/test-location-fix.js` at repo root of backend.
- `backend/src/routes/travel.ts` is 778 lines — route handler doing service work.
- `backend/src/server.ts` hardcodes `PORT = 5000` (ignores env).

### 1.3 Agent layer (keep the core — it's good)

- `backend/src/agents/travel-agent.ts` (1335 lines): LangGraph `StateGraph` with 3 nodes — `planner` → `tool_executor` → `response_formatter`. Uses `Annotation.Root` state with messages, detectedIntent, searchResults, itinerary, etc.
- `backend/src/agents/intent-detector.ts` (339 lines): LLM-based (gpt-4o-mini) intent classifier with a strong Zod schema — 24 intents including **modification intents** (`add_activity`, `remove_activity`, `replace_activity`, `modify_activity`, `move_activity`, `add_day`, `remove_day`, `find_and_add`), entity extraction (location, origin, destination, dates, duration, budget, people, target_day, time_slot, activity_name...), `tools_to_call`, confidence, and keyword fallback.
- `backend/src/agents/tool-registry.ts`: central registry over `mcp-servers/{places,transport,websearch}` tool arrays, with `executeTools` parallel fan-out.
- `chatController.sendMessage` already routes modification intents to `modifyItinerary` — the plan-editor-as-first-class-operation pattern **already exists in embryo**.

### 1.4 Frontend audit

**Routes (App.jsx):** `/` Landing, `/login`, `/signup`, `/onboarding`, `/plan` (TripPlanner), `/plan/preferences`, `/plan/budget`, `/plan/results`, `/home`, `/itinerary`, `/saved-trips`, `/upcoming-trips`, `/completed-trips`, `/chat`, `/search`, `/profile`. Catch-all → `/chat` if authed.

**Multi-step form funnel** (TripPlannerPage 831 lines → PreferencesPage → BudgetPage → ResultsPage) runs parallel to the chat flow and pushes into chat via `POST /api/chat/sync-itinerary`. This is the "scattered" feeling: two separate ways to build a trip.

**Three map stacks shipped:** Leaflet (`components/Map.jsx`, used by Chat page), Google Maps (`components/ItineraryMap.jsx` + `hooks/useGoogleMaps.js`, used by ItineraryPage), and `mapbox-gl` installed but **unused** (only a dangling `VITE_MAPBOX_TOKEN` type). `react-google-places-autocomplete` also pulls Google.

**State:** `contexts/AuthContext.jsx` (152 lines, localStorage JWT), `contexts/TripContext.jsx` (65 lines, in-memory form funnel state — lost on refresh), `zustand` installed but **unused**. Itinerary lives in: TripContext (form), Chat page local state, `Conversation.itinerary` (Mongo), and `localStorage` conversationId. Four sources of truth.

**Vibe-coded design traces (must all go):**
- Rainbow gradients `from-blue-500 to-pink-500` / `purple-600 to-pink-600`: `components/Navbar.jsx:147`, `components/ChatSidebar.jsx:270,315`, `components/Chat/MessageBubble.jsx:22,59`, `components/Chat/MessageInput.jsx:49,68,80`, `pages/TripPlannerPage.jsx:466,638,741` and more
- Animated glassmorphism blob decorations: `components/ChatSidebar.jsx:259-265`
- Mouse-trail laser effect: `src/index.css:209-220`
- Four hardcoded slider color themes: `components/ui/slider.jsx:27-52` + `src/index.css:109-200`
- Dark slate app shell (`bg-gradient-to-br from-slate-900...` in `App.jsx:35,49,65`) clashing with light pages
- Emoji as UI decoration in headers/empty states; `console.log` in render paths (`TripPlannerPage.jsx:549`); commented-out JSX blocks
- Tailwind config has only a `primary` blue scale — no real token system; font stack is default Inter

**Oversized components:** `pages/ItineraryPage.jsx` (**99 KB**), `components/TimelineItinerary.jsx` (47 KB), `pages/TripPlannerPage.jsx` (33 KB), `pages/UpcomingTripsPage.jsx` (27 KB), `pages/ProfilePage.jsx` (27 KB).

**Docs trail:** `docs/` contains 33 status-markdown files (`PHASE2-COMPLETE.md` etc.) — keep `ROADMAP.md`/`SETUP.md`, archive the rest.

### 1.5 What works (do not break)

- Socket.io real-time chat with `agent:thinking` / response events, conversation rooms, broadcast + client-side filtering
- LangGraph agent core + intent detector + tool registry
- Itinerary modification via chat (`modifyItinerary`) — the seed of the plan-editor
- Mongo persistence of conversations with embedded itinerary
- OpenTripMap places search with category mapping; Google Places for details/photos
- Auth flow (JWT) — functionally fine, needs consolidation not rewrite

---

## 2. Gap Analysis (current vs. reference products)

| Capability | Reference | TripWhat today | Action |
|---|---|---|---|
| Trips dashboard ("Trips" page with cards, Chronological/Recent/Past/Archived tabs) | Stardrift | 3 separate pages (Saved/Upcoming/Completed) | Consolidate into one Trips dashboard with tabs |
| Chat + map split view as the home of a trip | Stardrift | `/chat` has split view; itinerary is a separate 99KB page | Make `/trip/:id` the single trip workspace: chat left, map right, plan panel |
| Saved Places grid with city/category filter chips (All/Tokyo/Kyoto...) | Stardrift | Not present | Build from places already in itinerary + user-saved places |
| Bookings panel + "Connect Gmail" | Stardrift | Google Calendar OAuth exists (legacy server) | Keep calendar; defer Gmail import to later phase |
| Guided onboarding questionnaire (dates/flexible/nights, quick chips) | TheTarzanWay | 4-page form funnel (plan→preferences→budget→results) | Replace funnel with conversational onboarding inside chat, with structured chip/card widgets — entered ONLY on explicit user opt-in (3.2b) |
| Route proposal: per-city nights list rendered on map + "Confirm Route and Build Itinerary" | TheTarzanWay | Not present (itinerary generated in one shot) | New `propose_route` agent stage + route card UI |
| Quick-reply suggestion chips under agent messages | TheTarzanWay | Static "Try asking" buttons only | Agent emits contextual `suggestions[]` with each response |
| Plan edits via chat ("add 2n in Osaka") with visible diff | Both / exfiltrated | `modifyItinerary` exists for activities | Extend to city/nights-level ops; emit change summary |
| Missing-info structured questions | exfiltrated stage 3 | Agent just asks in prose | `needs_info` intent → structured question card widgets |
| 'Digital Wellness' design system (Section 4) | custom spec | Vibe-coded gradients/glass | Full redesign |

---

## 3. Target Architecture (hybrid: keep current strengths, adopt exfiltrated pipeline)

### 3.1 One backend

- **Single entry:** `backend/src/server.ts`, `PORT = process.env.PORT || 5000`. Delete legacy `server.js` and `backend/{routes,controllers,models,services,config,middleware}` (JS) after migrating the two things worth keeping: Google Calendar OAuth endpoints and saved-trip CRUD (re-implemented in TS).
- **One port, one API base.** Frontend gets a single `VITE_API_URL`.

### 3.2 Agent pipeline (evolve LangGraph, don't rewrite)

Current 3-node graph becomes a 6-stage pipeline, mapping the exfiltrated model onto existing files:

```
user message (Socket.io/HTTP)
  → Stage 1: intent_node          (existing intent-detector.ts — extend schema)
  → Stage 2: resolution_node      (NEW: place/destination resolution, context hydration)
  → Stage 3: slot_check_node      (NEW: missing-info gate → structured question cards)
  → Stage 4: router               (existing planner conditional edge — expanded)
       ├─ search path   → tool_executor (existing tool-registry, parallel fan-out)
       ├─ planning path → itinerary generation (consolidated builder)
       └─ editing path  → plan_editor_node (itineraryService ops, extended)
  → Stage 5: ranking/curation     (inside tool_executor post-processing)
  → Stage 6: response_formatter   (existing — now emits structured payload, not just markdown)
```

New/changed agent files:
- `backend/src/agents/intent-detector.ts` — add intents: `propose_route`, `confirm_route`, `start_planning`, `defer_planning`, `set_dates`, `set_travelers`, `save_place`, `show_bookings`, `needs_info` (as an *output* when confidence < threshold or required slots missing). Add `entities.cities[]` (multi-city with per-city nights) and `entities.change_summary_target`.
- `backend/src/agents/nodes/place-resolver.ts` (NEW) — resolves entity strings to canonical places: conversation context → saved places → Google Places lookup → web search only if still ambiguous. Caches resolutions on the conversation.
- `backend/src/agents/nodes/slot-check.ts` (NEW) — given intent + trip state, returns either `{ proceed: true }` or `{ proceed: false, questions: StructuredQuestion[] }` where questions render as UI cards (date picker, nights stepper, chip groups) instead of prose.
- `backend/src/agents/nodes/plan-editor.ts` (NEW, wraps `services/itineraryService.ts`) — executes `ItineraryAction`s; extends them with city-level ops: `add_city`, `remove_city`, `adjust_nights`, `reorder_cities`, `rebalance`. Returns `{ itinerary, changeSummary: [{type, description, target}] }`.
- `backend/src/agents/nodes/route-proposer.ts` (NEW) — for `plan_trip` with cities known: proposes per-city nights split, emits `route_proposal` payload; on `confirm_route`, hands to itinerary generation.
- `backend/src/agents/travel-agent.ts` — rewire graph to the above; keep Annotation state, add `tripState`, `pendingQuestions`, `suggestions`, `routeProposal`, `changeSummary` fields.

### 3.2a LangGraph node schema (detailed)

**What we take from `exfiltrated.txt`:** the 6-stage logical pipeline, the classification-first behavior (discovery vs plannable vs ready-to-search vs nonsensical), cache-tiered place resolution, structured missing-info questions, plan-editor-as-first-class-op, and suggestions emitted per response. **What we do NOT take:** any assumption about their internals — we keep our LangGraph + tool-registry + MCP servers and grow the graph.

**State schema** (extends the existing `AgentStateAnnotation` in `travel-agent.ts`):

```ts
const TripAgentState = Annotation.Root({
  // --- existing fields kept ---
  messages: Annotation<BaseMessage[]>,          // concat reducer
  userQuery: Annotation<string>,
  detectedIntent: Annotation<DetectedIntent>,
  searchResults: Annotation<Destination[]>,
  itinerary: Annotation<Itinerary | null>,      // working copy; persisted to Trip on write
  conversationId: Annotation<string>,
  response: Annotation<string>,
  error: Annotation<string | undefined>,
  // --- new fields ---
  classification: Annotation<'discovery' | 'plannable' | 'ready_to_search' | 'chitchat' | 'nonsensical'>,
  tripId: Annotation<string>,
  tripState: Annotation<Trip>,                  // canonical trip loaded from Mongo
  resolvedPlaces: Annotation<ResolvedPlace[]>,  // output of resolve node, with provenance
  pendingQuestions: Annotation<StructuredQuestion[]>,  // slot-gate output → QuestionCard widgets
  routeProposal: Annotation<RouteProposal>,     // { cities: [{name, nights, order}], rationale }
  changeSummary: Annotation<ChangeEntry[]>,     // [{ type, description, target }]
  widgets: Annotation<Widget[]>,                // typed payloads for chat UI
  suggestions: Annotation<string[]>,            // quick-reply chips
  cacheMeta: Annotation<{ baselineHit: boolean; reusedDayKeys: string[]; toolCallsSaved: number }>,
});
```

**Nodes (8 total) and edges:**

```
__start__ → classify_node
classify_node ─┬─ 'nonsensical'/'chitchat' ──────────────→ formatter_node
               ├─ 'discovery' (no destination yet) ──────→ formatter_node (conversational, zero tool calls)
               ├─ 'plannable' (trip intent, NOT opted in) ─→ formatter_node (conversational reply + soft PlanCtaCard; user may defer indefinitely)
               ├─ 'start_planning' (explicit opt-in) ─────→ slot_gate_node
               ├─ editing intents (trip exists) ──────────→ resolve_node → plan_editor_node → formatter_node
               └─ 'ready_to_search' ──────────────────────→ resolve_node → tool_executor_node → formatter_node

slot_gate_node ─┬─ slots missing → formatter_node (emits QuestionCard widgets, ENDs turn)
                └─ slots filled ─┬─ no route yet → route_propose_node → formatter_node (RouteProposalCard, ENDs turn)
                                 └─ route confirmed → builder_node → formatter_node

plan_editor_node → (city-level change that invalidates days) → builder_node (delta only) → formatter_node
plan_editor_node → (activity-level change, no regeneration) → formatter_node
builder_node → formatter_node → __end__
```

| Node | File | Responsibility | LLM? |
|---|---|---|---|
| `classify_node` | `agents/intent-detector.ts` (extended) | exfiltrated stages 1+2 merged: classify query type + detect intent + extract entities | gpt-4o-mini, temp 0.3 (existing) |
| `resolve_node` | `agents/nodes/place-resolver.ts` (NEW) | entity strings → canonical places via cache tiers (3.2c) | no (tool calls only) |
| `slot_gate_node` | `agents/nodes/slot-check.ts` (NEW) | onboarding slot machine (3.2b); emits `pendingQuestions` | no (deterministic) |
| `route_propose_node` | `agents/nodes/route-proposer.ts` (NEW) | per-city nights split + alternatives, emits `routeProposal` | gpt-4o-mini, cached per city-set |
| `tool_executor_node` | existing `tool-registry.ts` path in `travel-agent.ts` | parallel fan-out + ranking/curation (exfiltrated stage 5) | no |
| `plan_editor_node` | `agents/nodes/plan-editor.ts` (NEW) | deterministic itinerary mutations via `services/itinerary/editor.ts`; produces `changeSummary` | no (mutations are pure functions) |
| `builder_node` | `services/itinerary/builder.ts` (consolidated) | generates ONLY new/invalidated days (3.2d) | larger model, delta-only |
| `formatter_node` | existing `responseFormatterNode` (extended) | emits `{ text, widgets[], suggestions[], changeSummary }` | gpt-4o-mini |

No supervisor node — routing is declarative conditional edges off `classification`/`detectedIntent.primary_intent`, same pattern as today's planner edge. This keeps the graph debuggable and the prompt surface small.

### 3.2b Chat-first onboarding with DEFERRED planning

**Default state is conversation.** The app opens as a pure chat assistant: users can ask anything ("is October good for Japan?", "Kyoto vs Tokyo for food?") and get conversational answers with zero pressure to plan. A `Conversation` exists from message one; a `Trip` is created **only when the user explicitly opts into planning**.

**The deferral loop:**
1. When `classify_node` sees a `plannable` query (trip-shaped intent) but the user hasn't opted in, the formatter replies conversationally AND appends a soft `PlanCtaCard` widget: primary action **"Turn this into a trip plan"**, secondary dismiss **"Just exploring for now"** (`defer_planning` intent).
2. `defer_planning` is remembered on the conversation (`metadata.planningDeferred: true` + `deferCount`); the CTA then backs off — re-offered at most every N=5 substantive travel exchanges, or immediately if the user explicitly asks for a plan. Never naggy.
3. Opt-in (CTA click or phrases like "let's plan it") → `start_planning` → Trip created (status `'planning'`) → `slot_gate_node`.

**Slot machine (only after opt-in)** — the TheTarzanWay 4-screen questionnaire becomes structured `QuestionCard`s over the Trip model, asked in fixed order, one card per turn:
1. **Where?** — destination picker (multi-city allowed): fills `cities[]`
2. **When?** — `I have dates` / `Flexible` / `Not sure` segmented control; flexible → rough-month chips: fills `dates`
3. **How long?** — nights stepper: fills total nights (per-city split comes from route proposal)
4. **Who's going + vibe?** — travelers stepper, budget chips, pace chips: fills `travelers`, `budget.mode`, `pace`, `preferences`

Rules:
- Slots already known from prior conversation are **never re-asked** ("12 days in Japan in October" skips to slot 4).
- Free-text answers between cards feed back through `classify_node` ("actually make it 14 days" just works). User can also exit the slot flow back to free chat at any time; filled slots persist on the Trip.
- After all slots: `route_propose_node` emits the RouteProposalCard (per-city nights on the map + "Confirm Route and Build Itinerary" + suggestion chips like "Can we add more Osaka time?"). `confirm_route` → `builder_node`.
- Post-confirmation, the trip lives in `/trip/:id`; all further interaction is edits (plan_editor) and place population (tool_executor → `savedPlaces`).
- Even WITH a trip, generation is step-gated: slots → route proposal → explicit confirm. There is no path where an itinerary appears without two explicit user confirmations (opt-in + confirm route).

### 3.2c Place resolution + baseline destination cache

`resolve_node` walks tiers in order and stops at first hit; every resolution records `provenance`:

1. **Trip/conversation context** — already-resolved places in this trip/session (free)
2. **`DestinationBaseline` collection** (NEW, `backend/src/models/DestinationBaseline.ts`) — pre-computed data for popular destinations:
   ```ts
   DestinationBaseline {
     key: 'kyoto-jp',                    // slugified city+country
     name, country, coordinates, popularityScore,
     topAttractions: PlaceRef[], topRestaurants: PlaceRef[], neighborhoods: PlaceRef[],
     routeTemplates: [{ nights, cities[] }],   // common splits, e.g. "7N Japan → Tokyo 3 / Kyoto 2 / Osaka 2"
     refreshedAt, ttlDays: 30
   }
   ```
   Seeded by `scripts/seed-baselines.ts` for the top ~200 destinations; refreshed lazily when stale.
3. **Live tools** — OpenTripMap discovery / Google Places lookup
4. **Web search** — only for niche/ambiguous places (the "Kamchatka" case), then **written back** into the baseline cache so the next user gets a tier-2 hit. Self-growing cache.

Flight/hotel results keep using the existing `FlightCache` pattern (TTL collection), extended to hotels.

### 3.2d Regeneration bug fix + token-cost control

**The bug:** today, edits eventually trigger full itinerary regeneration, which drops previously generated/curated items (and burns tokens re-generating unchanged days).

**Root cause:** the modify path rebuilds the whole itinerary from scratch instead of patching it.

**Fix (three rules, enforced in code):**
1. **Edits never regenerate.** All `add/remove/replace/modify/move` intents are pure functions in `plan_editor_node` on the persisted itinerary. Zero LLM calls except the initial entity extraction in `classify_node`.
2. **Builder is delta-only.** Each `Day` gets a `signature` (hash of `city + date + slot count + pace`). `builder_node` computes signatures of existing days vs. required days; days with matching signatures are **copied verbatim** from `tripState`; only new or invalidated days go to the LLM. City-level ops (`adjust_nights`, `add_city`) invalidate only the affected city's days; `rebalance` invalidates only days whose slot density changes.
3. **Pinned items survive everything.** Any activity the user added manually, saved, or explicitly kept gets `metadata.pinned: true`; pinned activities are excluded from invalidation and re-inserted by the editor after any structural change.

**Token budget per message (target):** chitchat/discovery ≈ 1 mini call; search ≈ 1 mini + tools; edit ≈ 1 mini; new-day generation ≈ 1 large call **per new day only**. `cacheMeta` on state logs `toolCallsSaved`/`reusedDayKeys` so we can verify savings.

### 3.3 Canonical trip state (the core redesign)

One Mongoose model is the single source of truth; everything else projects from it.

**New model `backend/src/models/Trip.ts`:**
```ts
Trip {
  _id, userId, title, status: 'planning'|'upcoming'|'completed'|'archived',
  conversationId,                      // 1:1 with chat
  origin: { name, iata?, coordinates },
  cities: [{ name, placeId, coordinates, nights, order }],
  dates: { start, end, flexible: boolean, roughMonth? },
  travelers: { adults, children? },
  budget: { total, currency, mode: 'capped'|'flexible', split? },
  preferences: string[],
  pace: 'relaxed'|'moderate'|'packed',
  itinerary: Itinerary,                // day-by-day, from consolidated types; each Day carries a `signature` hash (3.2d); Activities support `metadata.pinned`
  savedPlaces: [{ placeId, name, category, city, coordinates, rating?, photo?, source }],
  onboarding: { slotsFilled: string[], completed: boolean },  // drives slot_gate_node (3.2b)
  routeProposal?: RouteProposal,       // persisted until confirmed
  bookings: [{ type: 'flight'|'hotel', provider, summary, price?, deepLink?, status }],
  version: number,                     // incremented per plan-editor op
  createdAt, updatedAt
}
```

- Replaces: `backend/models/Trip.js`, `SavedTrip.js`, `TravelPlan.js`, and `Conversation.itinerary` (itinerary moves to Trip; Conversation keeps messages only).
- Migration script `backend/scripts/migrate-trips.ts`: convert existing SavedTrip/TravelPlan docs into Trip; delete old collections after verification.
- Frontend reads trip state via REST and receives mutations via Socket.io `trip:updated` events (full doc or JSON patch + `changeSummary`).

### 3.4 Consolidated services

| Keep / create | Absorbs / deletes |
|---|---|
| `services/itinerary/` module: `builder.ts` (merge of itineraryBuilder + enhancedItineraryBuilder, one `build(tripContext, options)` with `includeTravelMeans` flag), `editor.ts` (current itineraryService), `types.ts` (single Itinerary/Day/TimeSlot/Activity types) | deletes `itineraryBuilder.ts`, `enhancedItineraryBuilder.ts`, `itineraryService.ts`, duplicate types in `types/itinerary.ts` |
| `services/inventory/` — ONE provider-agnostic module for flights + hotels (3.4a), SerpApi implementation, mounted at `/api/flights` + `/api/hotels` | deletes `amadeusService.ts`, `flightService.ts` (rewritten), `routes/flights.ts` duplication, legacy `travelDataController.js` |
| `services/places/` — Google Places (details/photos/autocomplete) + OpenTripMap (discovery) behind one `placesService.ts` facade | deletes legacy `backend/services/placesService.js`, `routes/placesRoutes.js` |
| `services/calendar/calendarService.ts` — port Google OAuth endpoints from `server.js` into `src/routes/calendar.ts`; persist tokens on User model (currently in-memory Map!) | deletes legacy calendar code |
| `routes/trips.ts` (NEW) — CRUD + status transitions for Trip model | replaces savedTripRoutes/tripRoutes/travelDataRoutes |

Route table (final, all under `src/routes/`, all `/api/*`):
`auth.ts`, `chat.ts`, `trips.ts`, `itinerary.ts` (generate/refine → thin wrappers over agent), `flights.ts`, `hotels.ts`, `places.ts`, `calendar.ts`.

### 3.4a Travel inventory: Amadeus replacement (provider-agnostic)

**Decision: SerpApi as the primary provider** — one API key covers both engines:
- **Flights** → SerpApi `engine=google_flights` (best_flights/other_flights, per-leg details, layovers, price insights, `booking_token` → booking-options deep links)
- **Hotels** → SerpApi `engine=google_hotels` (properties with rate_per_night, images, GPS, amenities, free_cancellation, booking deep links)
- **Airport/city autocomplete** (was `amadeus.referenceData.locations.get`) → **Google Places autocomplete** (already integrated in `googlePlacesAPI.ts`); SerpApi `google_flights_autocomplete` as fallback for IATA-code resolution
- **Flight inspiration** (was `amadeus.shopping.flightDestinations.get`) → SerpApi `google_flights_deals`; low priority, can ship after launch

Why SerpApi: matches our deep-link-only booking model (Non-Goals), one key for flights+hotels, free tier 250 searches/mo for dev ($75/5k at scale), normalized JSON. **Upgrade path:** Duffel if we ever do real booking (NDC, ticketing, sandbox) — the provider interface makes this a swap, not a rewrite.

**Architecture — provider interface so this never happens to us again:**
```ts
// backend/src/services/inventory/types.ts
interface FlightProvider {
  searchOffers(q: FlightQuery): Promise<FlightOffer[]>;   // normalized shape
  autocomplete(term: string): Promise<AirportRef[]>;
}
interface HotelProvider {
  search(q: HotelQuery): Promise<HotelOffer[]>;            // normalized shape
}
// backend/src/services/inventory/serpapi/serpApiProvider.ts  ← implements both
// backend/src/services/inventory/index.ts                   ← reads INVENTORY_PROVIDER env, exports active provider
```
`routes/flights.ts` / `routes/hotels.ts` and `travelMeansService.ts` (flight offers for travel legs) consume ONLY the interface. Normalized shapes live in `types.ts` and are zod-validated; the existing `FlightCache` TTL pattern caches SerpApi responses (extends to `HotelCache`) to stay within the monthly search quota.

**Delete:** `services/amadeusService.ts` (1453 lines), `amadeus` npm package, `AMADEUS_*` env vars; strip Amadeus calls out of `travelMeansService.ts` / `enhancedItineraryBuilder.ts` and re-point them at the provider interface.

### 3.5 Frontend architecture

- **State:** adopt zustand (already installed): `stores/tripStore.ts` (canonical trip, socket-bound), `stores/chatStore.ts`, `stores/uiStore.ts`. Delete `TripContext` and prop-drilled itinerary state. AuthContext stays (or move to zustand too — one pattern).
- **One API client:** `lib/api.ts` → single `VITE_API_URL`, typed endpoints, axios instance with auth interceptor. No page builds URLs itself.
- **One map:** standardize on **Google Maps** (already needed for Places photos/details; ItineraryMap exists). Delete Leaflet (`Map.jsx`, `react-leaflet`, `leaflet`, `@types/leaflet`) and uninstall `mapbox-gl`. One `components/map/TripMap.tsx` with modes: markers, route polyline (city order), day-filtered.
- **Route structure (final):**
  - `/` → Landing (restyled)
  - `/login` `/signup` (restyled)
  - `/trips` → **Trips dashboard** (absorbs Saved/Upcoming/Completed pages; tabs: Chronological / Recently Edited / Past / Archived)
  - `/trip/:id` → **Trip workspace**: left chat column (~35%), right map; below-map panel tabs: `Plan` (day-by-day) / `Saved` (places grid with city filter chips) / `Bookings`
  - `/new` → chat-first new trip (agent-guided onboarding; no form funnel)
  - `/profile` (restyled, includes calendar connection)
  - Delete: `/plan`, `/plan/preferences`, `/plan/budget`, `/plan/results`, `/home`, `/itinerary`, `/search` (search moves into Navbar omni-search + chat), `/onboarding` (replaced by in-chat onboarding)
- **Chat widgets** (agent-emitted, rendered inline): `SuggestionChips`, `PlanCtaCard` (soft "Turn this into a trip plan" / "Just exploring for now" CTA, 3.2b), `RouteProposalCard` (per-city nights + map highlight + Confirm button), `QuestionCard` (date picker / nights stepper / chip groups), `FlightCard`, `HotelCard`, `ChangeSummaryCard` ("Updated plan with N changes" + list). Payloads arrive as typed `widgets[]` on the chat response — the response_formatter emits them; frontend renders by discriminated union.

---

## 4. Design System (locked: 'Digital Wellness' — warm pastel, tactile, intentionally slow)

Aesthetic north star: a **'digital living room'** — minimalist, tactile, calm. Digital-minimalism layout with soft lifestyle warmth. Every screen should feel low-velocity: nothing snaps, nothing flashes.

### 4.1 Tokens — single source in `tailwind.config.js` + CSS variables

```
Fonts (Google Fonts, loaded in index.html):
  --font-sans:    "Outfit", system-ui, sans-serif         /* everything: UI + headings */
  --font-accent:  "Reenie Beanie", cursive                /* handwritten emphasis ONLY: 
                                                              section labels, empty-state notes,
                                                              suggestion-chip prefixes, map annotations */
Headings: 48–96px on landing/empty states, 24–32px in-app; tracking -0.025em; sentence case ONLY (no ALL CAPS, no Title Case headlines)

Colors (warm, desaturated pastels):
  --bg:        #FDFCF8   /* primary background, warm paper-white */
  --sage:      #E8EFE8   /* secondary surface / agent message tint */
  --lavender:  #EFEDF4   /* tertiary surface / selected states */
  --peach:     #FFB7B2   /* PRIMARY ACCENT: CTAs, active states, key highlights — the only saturated color */
  --ink:       #292524   /* soft-black text */
  --muted:     #78716C   /* secondary text */
  --surface:   #FFFFFF   /* cards sit on bg with shadow, not borders */
  NO other hues in UI chrome. Map marker/category colors are exempt (map-only).

Texture (the signature element):
  Persistent fractal-noise SVG grain overlay, fixed position, pointer-events:none,
  opacity 0.35, mix-blend-mode multiply, z-index above bg below content.
  Implemented ONCE in App root as <GrainOverlay /> — an inline feTurbulence SVG data-URI. Never per-component.

Background blobs (the only allowed blur decoration):
  2–3 oversized pastel blobs (sage/lavender/peach at ~40% alpha) with high-radius blur (blur-3xl),
  positioned fixed behind content, floating animation: 6s ease-in-out loop, translateY ±10px.
  Implemented ONCE as <AmbientBlobs /> in App root. Forbidden inside cards/panels.

Radii:    containers/cards 2rem; hero panels up to 4rem; inputs 1.25rem; chips pill (999px)
Shadows:  one token — 0 4px 20px -2px rgba(0,0,0,0.05); hover deepens to 0 8px 30px -4px rgba(0,0,0,0.08)
Borders:  avoid; when needed, 1px rgba(41,37,36,0.06) hairline
Spacing:  generous whitespace; section padding py-16/py-24; max-w-6xl content
```

### 4.2 Motion spec (slow on purpose)

- **Reveal-on-scroll:** translateY 30px → 0 + opacity 0 → 1, duration **0.8s**, ease-out, once per element (IntersectionObserver hook `useReveal`).
- **Widget mount (chat cards):** 400ms ease-out, translateY 12px — slower than typical chat apps, intentional.
- **Ambient blobs:** 6s loop as above.
- **Panel transitions / hover:** 300ms.
- Forbidden: bounce/spring overshoot, scale-on-hover buttons, pulse/flash animations, stagger cascades faster than 100ms apart.

### 4.3 Hard rules (anti-vibe-coding)

- No gradients (the old `blue-500→pink-500` family is lint-banned), no glassmorphism card stacks, no mouse-trail effect, no emoji in UI chrome, no per-component color systems, no `console.log` in render paths, no commented-out JSX in committed code.
- Blur decoration exists ONLY in `<AmbientBlobs />`; grain ONLY in `<GrainOverlay />`. Anywhere else = rejected in review.
- Every color/font/radius/shadow references tokens; add an ESLint `no-restricted-syntax` rule (or pre-commit grep) banning `bg-gradient`, `from-blue-*`, `to-pink-*`, `backdrop-blur` outside the two sanctioned components, and hardcoded hex colors outside the token file.
- Reenie Beanie is garnish, not body text: max one accent phrase per view.

### 4.4 Component restyle order

`ui/*` primitives first (button → peach accent pill; card → 2rem radius + soft shadow; input, badge, tabs; slider loses its 4 color themes → single peach accent), then `<GrainOverlay />` + `<AmbientBlobs />` + App shell, then Navbar, then chat (MessageBubble: agent = sage-tinted card, user = white card with hairline; Reenie Beanie for the assistant's handwritten greeting/empty states; MessageInput: 1.25rem radius, peach send button), then trip workspace, then trips dashboard, then auth/landing.

---

## 5. Phased Execution Plan (test-driven)

Each phase ends in a working app. Phases are ordered so deletion happens only after replacement is verified.

### 5.0 TDD strategy (applies to every phase)

**Rule: no feature merges without tests written first.** The workflow per feature is: write failing test → implement → green → refactor. Nothing in this plan is "test later."

**Backend (vitest + supertest + mongodb-memory-server):**
- `backend/tests/unit/agents/` — every graph node unit-tested with a **mocked LLM client** (fixture responses, no API keys in CI): classify (one test per classification + per intent, incl. `defer_planning`/`start_planning`), slot-gate (fill order, skip-known-slots, exit-to-chat), route-proposer, plan-editor (every op + pinned survival + change-summary shape), resolver (tier ordering, baseline hit/miss, web-search write-back).
- `backend/tests/unit/services/itinerary/` — editor ops are pure functions: property-style tests (op applied → invariants hold: day count, pinned items present, signatures stable for untouched days). Delta-builder tests assert **LLM is not invoked** for unchanged days (spy on the model client).
- `backend/tests/integration/` — supertest against routes with in-memory Mongo: auth, trips CRUD, chat POST → widget payload shape (zod-validated), socket `trip:updated` emission (socket.io-client against test server).
- **Contract tests:** every widget payload and socket event has a zod schema in a shared `packages/schemas` (or `backend/src/schemas` imported by frontend); a test validates formatter output against schemas so backend/frontend can never drift.
- Coverage gate: `services/` and `agents/` ≥ 85% lines, `plan-editor` 100% branches. Enforced in `vitest.config` (`coverage.thresholds`) so CI fails below it.

**Frontend (vitest + React Testing Library + Playwright):**
- `frontend/tests/unit/` — stores (tripStore applies `trip:updated` correctly, changeSummary rendering state), widget components (each renders from its schema payload; QuestionCard interactions fire correct intents), GrainOverlay/AmbientBlobs render-once guards.
- `frontend/tests/e2e/` (Playwright, golden paths only):
  1. auth → /trips loads
  2. chat: travel question → conversational reply + PlanCtaCard → click "Just exploring" → CTA backs off (no re-prompt within 5 exchanges)
  3. chat: "let's plan it" → slot QuestionCards → route proposal → Confirm → itinerary renders on map + Plan tab
  4. edit: "add another 2n in Osaka" → ChangeSummaryCard + map update + Tokyo/Kyoto days byte-identical
  5. saved places filter chips; bookings tab
- Mock backend via Playwright route interception (fixture API responses) so e2e never needs API keys or live LLMs.

**Phase 0 addition:** stand up the harness FIRST — vitest configs, mongodb-memory-server, Playwright, schema package, CI workflow (`.github/workflows/test.yml`: lint + unit + integration + e2e). Every later phase starts by writing its failing tests.

### Phase 0 — Safety & hygiene (no behavior change)
1. Create `modernization` branch; all work happens there.
2. Delete dead files: `backend/test-hotel-search.js`, `backend/test-location-fix.js`, `backend/src/agents/test-agent.ts`, `backend/src/mcp-servers/places/test-manual.ts`.
3. Archive `docs/*-COMPLETE.md`, `PHASE*.md` etc. into `docs/archive/`; keep `ROADMAP.md`, `SETUP.md`, this plan.
4. Add root `.nvmrc` and README quickstart (two commands: `npm run dev` in backend, `npm run dev` in frontend).
5. Uninstall unused: `mapbox-gl`, `@types/mapbox-gl`, `react-hook-form` (if unused — verify), `ioredis` (verify unused), `cheerio` (verify usage in websearch; keep if used).

### Phase 1 — Backend consolidation to one server (+ URGENT: Amadeus replacement)
**Amadeus is already shut down, so flights/hotels are broken in production TODAY — the provider swap is the first task of this phase, not an afterthought.**
Tests first: integration tests for calendar endpoints, trips CRUD, places proxy, auth round-trip against in-memory Mongo (these become the regression net proving the legacy server is safe to delete). Contract tests for the inventory provider interface (recorded SerpApi fixtures via nock/msw — no live key in CI).
1. **Amadeus → SerpApi swap (3.4a):** build `services/inventory/` (types + provider interface + SerpApi impl + caches); rewrite `routes/flights.ts` on it; add `routes/hotels.ts`; re-point `travelMeansService.ts`; delete `amadeusService.ts` + `amadeus` dep + `AMADEUS_*` envs (add `SERPAPI_API_KEY`, `INVENTORY_PROVIDER=serpapi`).
2. Port Google Calendar endpoints from `backend/server.js` → `backend/src/routes/calendar.ts` + `services/calendar/calendarService.ts`; store OAuth tokens on `src/models/User.ts` (field `googleTokens`), replacing the in-memory `userGoogleTokens` Map.
3. Re-implement saved-trip CRUD in TS as `src/routes/trips.ts` against the NEW `Trip` model (Section 3.3); write `scripts/migrate-trips.ts`.
4. Move `/api/places/autocomplete|search` into `src/routes/places.ts` backed by `services/places/placesService.ts`.
5. Point `frontend/src/lib/api.js` base URL at port 5000 (`VITE_API_URL=http://localhost:5000`); verify auth/saved-trips/calendar all work against the TS server.
6. `src/server.ts`: read port from env; remove imports from legacy `../routes/*.js`.
7. **Delete** `backend/server.js`, `backend/{routes,controllers,models,services,config,middleware}/*.js` (the entire legacy tree), `package.json` `"start": "node server.js"` → `"start": "node dist/server.js"` after `tsc` build.
8. Smoke-test: login, flight search returns offers, hotel search returns properties, create trip via chat, save, list, calendar connect.

### Phase 2 — Itinerary consolidation + canonical trip state
Tests first: editor-op invariant suite (day counts, pinned survival, signature stability) + Trip model round-trip + migration script dry-run tests.
1. Create `services/itinerary/` module (builder merge, editor, single types). Merge `enhancedItineraryBuilder.buildItineraryWithTravelMeans` into `builder.build(ctx, { includeTravelMeans })`; keep `travelMeansService.ts` as a dependency.
2. Move itinerary mutation ops to `services/itinerary/editor.ts`; extend `ItineraryAction` with `add_city | remove_city | adjust_nights | reorder_cities | rebalance`.
3. Create `src/models/Trip.ts`; refactor `chatController` to load/save Trip instead of `Conversation.itinerary`; keep `sync-itinerary` temporarily for the form funnel (removed in Phase 4).
4. Emit Socket.io `trip:updated` with `{ trip, changeSummary }` on every editor op.
5. Delete `itineraryBuilder.ts`, `enhancedItineraryBuilder.ts`, `itineraryService.ts`, `types/itinerary.ts` duplicates.

### Phase 3 — Agent pipeline upgrade (8 nodes, per 3.2a–3.2d)
1. Extend `intent-detector.ts` schema (new intents + `cities[]` entities + `classification` field).
2. Add `nodes/place-resolver.ts` (cache tiers per 3.2c), `nodes/slot-check.ts` (onboarding slot machine per 3.2b), `nodes/route-proposer.ts`, `nodes/plan-editor.ts`; rewire `travel-agent.ts` graph per 3.2a state schema and edge map.
3. Create `models/DestinationBaseline.ts` + `scripts/seed-baselines.ts` (top ~200 destinations); wire tier-2 hits and web-search write-back in the resolver.
4. Delta-only builder (3.2d): add `signature` to Day, `metadata.pinned` to Activity, signature-diffing in `builder.ts`; verify edits never regenerate unchanged days.
5. Upgrade `response_formatter` to emit `{ text, widgets[], suggestions[], changeSummary, tripVersion }`.
6. `chatController` passes through widgets/suggestions; emits `agent:status` per stage for the UI.
7. Tests: proper vitest suite covering: classification for each query type, slot-gate skip logic (never re-ask known slots), route proposal → confirm → generate, each editor op, pinned-item survival, day-signature reuse (assert LLM not called for unchanged days), change-summary correctness, baseline-cache hit/write-back.

### Phase 4 — Frontend state + navigation rebuild
Tests first: store unit tests + widget render tests + Playwright golden paths 1–3 against mocked API.
1. zustand stores (`tripStore`, `chatStore`, `uiStore`); delete `TripContext`; socket listeners live in `tripStore`.
2. New `lib/api.ts` (single axios instance, typed).
3. New route table (Section 3.5); build `/trips` dashboard and `/trip/:id` workspace shell; delete old pages: `TripPlannerPage`, `PreferencesPage`, `BudgetPage`, `ResultsPage`, `SavedTripsPage`, `UpcomingTripsPage`, `CompletedTripsPage`, `ItineraryPage`, `Home`, `OnboardingPage`, `SearchPage`, and components `TimelineItinerary`, `TripPlanningSidebar`, `ItineraryOverlay`, `Map.jsx`, `HotelSearch.jsx` (superseded), dead code in `Chat.jsx` split view absorbed into workspace.
4. Map consolidation: single `components/map/TripMap.tsx` (Google Maps); uninstall leaflet stack.
5. Chat widgets (Section 3.5) rendered from `widgets[]`.

### Phase 5 — Design system rollout
Tests first: Playwright visual-regression snapshots per page (against token baseline); lint-guard test that banned classes don't exist in `src/`.
1. Tokens into `tailwind.config.js` + Google Fonts link (**Outfit** 400/500/600/700 + **Reenie Beanie**) in `index.html`; build `<GrainOverlay />` and `<AmbientBlobs />` at App root; `useReveal` hook.
2. Restyle `ui/*` primitives, then pages in order: workspace → trips dashboard → auth → landing → profile.
3. Purge: all gradient/glass/emoji/mouse-trail code (full-text greps in Section 1.4 are the checklist); remove slider color configs; simplify `index.css` to tokens + minimal utilities.
4. Add lint guard for banned classes; final pass for `console.log` and dead JSX.

### Phase 6 — Polish & deploy-readiness
1. Env audit: consolidate `.env.example` files; document every var (`OPENAI_API_KEY`, `OPENTRIPMAP_API_KEY`, `GOOGLE_PLACES_API_KEY`, `SERPAPI_API_KEY`, `INVENTORY_PROVIDER`, `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_*`, `PORT`, `FRONTEND_URL`).
2. Error/empty/loading states for every widget and page (skeletons, not spinners-in-void).
3. Basic rate limiting on `/api/chat` and auth routes; helmet; CORS locked to `FRONTEND_URL`.
4. Production build check (`tsc` + `vite build`), then deploy.

---

## 6. File-Level Change Index (quick reference for the implementing agent)

**DELETE (after phase gates):**
- `backend/server.js`, `backend/routes/*.js`, `backend/controllers/*.js`, `backend/models/*.js`, `backend/services/placesService.js`, `backend/config/{db,configenv}.js`, `backend/middleware/auth.js`
- `backend/src/services/itineraryBuilder.ts`, `backend/src/services/enhancedItineraryBuilder.ts`, `backend/src/services/itineraryService.ts` (absorbed into `services/itinerary/`)
- `backend/src/services/amadeusService.ts`, `backend/src/services/flightService.ts` (rewritten under `services/inventory/`), npm `amadeus` package, all `AMADEUS_*` env vars
- `backend/test-*.js`, `backend/src/agents/test-agent.ts`, `backend/src/mcp-servers/places/test-manual.ts`
- Frontend pages: `TripPlannerPage`, `PreferencesPage`, `BudgetPage`, `ResultsPage`, `SavedTripsPage`, `UpcomingTripsPage`, `CompletedTripsPage`, `ItineraryPage`, `Home`, `OnboardingPage`, `SearchPage`
- Frontend components: `TimelineItinerary.jsx`, `TripPlanningSidebar.jsx`, `ItineraryOverlay.jsx`, `Map.jsx`, `HotelSearch.jsx`, `ChatSidebar.jsx` (replaced by workspace chat column)
- `docs/archive/` candidates (all PHASE*/COMPLETE* files)
- npm: `leaflet`, `react-leaflet`, `@types/leaflet`, `mapbox-gl`, `@types/mapbox-gl`

**CREATE:**
- Backend: `src/models/Trip.ts`, `src/models/DestinationBaseline.ts`, `src/models/HotelCache.ts`, `src/routes/{trips,places,calendar,hotels}.ts`, `src/services/inventory/{types,index}.ts` + `src/services/inventory/serpapi/serpApiProvider.ts`, `src/services/itinerary/{builder,editor,types}.ts`, `src/services/calendar/calendarService.ts`, `src/services/places/placesService.ts`, `src/agents/nodes/{place-resolver,slot-check,route-proposer,plan-editor}.ts`, `scripts/{migrate-trips,seed-baselines}.ts`
- Frontend: `stores/{tripStore,chatStore,uiStore}.ts`, `pages/TripsPage.tsx`, `pages/TripWorkspacePage.tsx`, `components/map/TripMap.tsx`, `components/chat/widgets/{SuggestionChips,PlanCtaCard,RouteProposalCard,QuestionCard,FlightCard,HotelCard,ChangeSummaryCard}.tsx`, `components/{GrainOverlay,AmbientBlobs}.tsx`, `hooks/useReveal.ts`

**MODIFY (heavy):** `backend/src/agents/travel-agent.ts`, `intent-detector.ts`, `controllers/chatController.ts`, `src/server.ts`, `frontend/src/App.jsx`, `components/Chat/*`, `components/Navbar.jsx`, `tailwind.config.js`, `index.css`, `index.html`

**KEEP AS-IS (works, don't touch):** `agents/tool-registry.ts`, `mcp-servers/*` (places/transport/websearch), `services/{openaiWebSearch,googlePlacesAPI}.ts` (behind facades), `models/Conversation.ts` (messages only), auth flow logic. (`travelMeansService.ts` kept but re-pointed at the inventory provider; `flightService.ts` absorbed into `services/inventory/`.)

---

## 7. Verification Commands

```bash
# Backend
cd backend && npm run dev                          # TS server on :5000
npx tsx scripts/migrate-trips.ts --dry-run         # Phase 2 migration check
npm run test                                       # vitest agent suite (Phase 3)

# Frontend
cd frontend && npm run dev                         # Vite on :5173
npm run build                                      # must pass with zero warnings

# Manual smoke (after each phase)
# 1. login → /trips loads
# 2. chat: "is October good for Japan?" → conversational reply + PlanCtaCard → "Just exploring for now" → keeps chatting freely
# 2b. chat: "let's plan it" → slot QuestionCards (known slots skipped) → route proposal card → Confirm → itinerary + map
# 3. chat: "add another 2n in Osaka" → change summary card + map/route update; verify Tokyo/Kyoto days unchanged (delta-only builder)
# 3b. chat: "replace the day 2 temple with a food tour" → only that activity changes; pinned/user-added items survive
# 3c. plan a niche destination (e.g. Kamchatka) → resolver falls through to web search, then baseline cache is written (second request is a cache hit)
# 4. /trip/:id → Saved tab filters by city chips; Bookings tab lists added flights/hotels
```

## 8. Non-Goals (this cycle)

- Gmail booking import (Stardrift feature) — calendar stays, email parsing deferred
- Real-time collaboration / sharing ("Share" button) — deferred
- Mobile native — responsive web only
- Payments/actual booking — deep links only
