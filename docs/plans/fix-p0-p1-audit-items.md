# Plan: Fix P0/P1 Audit Items

> Task: Fix all P0 and P1 issues from the production readiness audit.
> Plan file: `docs/plans/fix-p0-p1-audit-items.md`

## Impact Analysis Summary

**Risk Level: MEDIUM** — 6 symbols modified, 3 execution flows affected, no critical path.

| Symbol | File | Direct Callers | Risk |
|--------|------|---------------|------|
| `createTrip` | `tripStore.ts` | `NewTripPage.tsx:24` | LOW — single caller, payload fix |
| `updateTrip` | `tripStore.ts` | `NewTripPage.tsx:29`, `TripWorkspacePage.tsx:33` | LOW — error handling added |
| `fetchTrips` | `tripStore.ts` | `TripsPage.tsx:11` | LOW — error handling added |
| `fetchTrip` | `tripStore.ts` | `TripWorkspacePage.tsx:21` | LOW — error handling added |
| `create_trip` | `trips.py` | HTTP endpoint | LOW — date extraction added |
| `update_trip` | `trips.py` | HTTP endpoint | LOW — date extraction added |
| `_trip_to_dict` | `trips.py` | All trip routes | LOW — no change needed (already returns tripState) |

**Affected execution flows:**
1. Trip creation flow (NewTripPage → createTrip → POST /api/saved-trips)
2. Trip update flow (TripWorkspacePage → updateTrip → PUT /api/saved-trips/:id)
3. Trip listing flow (TripsPage → fetchTrips → GET /api/saved-trips)

---

## Implementation Sequence

### Commit 1: Fix backend schema — `TripResponse` missing `tripState`

**File:** `backend-python/app/schemas/trip.py`
- Add `tripState: dict | None = None` to `TripResponse` class (line 73, after `generatedItinerary`)
- Also add `travelMeans: dict | None = None` for completeness

**Risk:** LOW — `TripResponse` is defined but never used as `response_model`. Adding field is additive.

### Commit 2: Fix `createTrip` payload type mismatches (P0)

**File:** `frontend/src/stores/tripStore.ts`
- Line 120: Change `people: ts.travelers || '1'` → `people: 1` (travelers is a string like "solo"; backend expects int. Default to 1.)
- Line 121: Change `travelType: ts.preferences?.join(', ') || 'cultural'` → `travelType: 'balanced'` (preferences is an array of arbitrary strings; use a sensible default. The trip_style is stored in tripState already.)
- Line 122: Change `budget: 'mid-range'` → `budget: null` (backend expects BudgetSchema object or null, not a string)

**Risk:** LOW — `createTrip` is called only from `NewTripPage.tsx:24`. The payload fields being fixed are not used by the frontend after creation (they're stored in `tripState` which is already correct).

### Commit 3: Fix `fetchTrips` — `res.ok` check + fetch all trips (P1)

**File:** `frontend/src/stores/tripStore.ts`
- In `fetchTrips`: add `if (!res.ok) throw new Error(...)` before `res.json()`
- Change the fetch URL from `/api/saved-trips` to fetch from all three endpoints and merge, OR change the backend list endpoint to return all trips.

**Decision:** Change the backend list endpoint to return ALL trips (remove `is_upcoming != True` and `is_completed != True` filters). This is simpler and lets the frontend filter client-side as it already does.

**File:** `backend-python/app/routes/trips.py`
- Lines 81-84: Remove the `is_upcoming != True` and `is_completed != True` filters from `list_trips` query
- Lines 97-100: Remove same filters from count query

**Risk:** MEDIUM — affects the "all" tab. Currently it only shows saved (non-upcoming, non-completed) trips. After fix, it shows all trips. This is the correct behavior since the frontend already filters by tab.

### Commit 4: Fix `fetchTrip` and `createTrip` and `updateTrip` — `res.ok` check (P1)

**File:** `frontend/src/stores/tripStore.ts`
- In `fetchTrip`: add `if (!res.ok) throw new Error(...)` before `res.json()`
- In `createTrip`: add `if (!res.ok) throw new Error(...)` before `res.json()`
- In `updateTrip`: add `if (!res.ok) throw new Error(...)` before `res.json()`
- In `deleteTrip`: add `if (!res.ok) throw new Error(...)` (no JSON parse needed, but check response)

**Risk:** LOW — only adds error checking, doesn't change happy path.

### Commit 5: Fix backend — auto-set `is_upcoming` and dates from `tripState` on create (P1)

**File:** `backend-python/app/routes/trips.py`
- In `create_trip`: after creating the Trip object, if `req.tripState` has `dates.start`, parse it and set `trip.start_date`, `trip.trip_start_date`, and calculate `trip.trip_end_date` from `total_days`. If the start date is in the future, set `is_upcoming = True`.

**File:** `backend-python/app/routes/trips.py`
- In `update_trip`: when `tripState` is updated, extract dates from `tripState.dates` and update `trip_start_date` and `trip_end_date`. Update `is_upcoming` based on whether the start date is in the future.

**Risk:** MEDIUM — adds date parsing logic. Need to handle flexible dates (no specific start date).

### Commit 6: Fix React anti-patterns (P1)

**File:** `frontend/src/pages/ProfilePage.jsx:79-82`
- Move `if (!user) { navigate("/login"); return null; }` into a `useEffect`

**File:** `frontend/src/pages/TripWorkspacePage.tsx:25`
- Add `fetchTrip`, `connectSocket`, `disconnectSocket` to useEffect dependency array (or use refs)

**File:** `frontend/src/components/Chat/ChatPanel.tsx:71-75`
- Fix `useEffect` for `initialMessage` — add proper deps or use a more robust ref guard pattern

**Risk:** LOW — standard React fixes, no logic changes.

### Commit 7: Fix API route mismatches (P1)

**File:** `frontend/src/lib/api.ts`
- `travelApi.flights`: Change `/api/travel-data/flights` → `/api/flights`
- `travelApi.hotels`: Change `/api/travel-data/hotels` → `/api/hotels`
- `travelApi.events`: Change `/api/travel-data/events` → remove (no backend endpoint)
- `travelApi.weather`: Change `/api/travel-data/weather` → remove (no backend endpoint)
- `travelApi.restaurants`: Change `/api/travel-data/restaurants` → remove (no backend endpoint)

**Note:** `travelApi` is never imported by any component, so this is technically dead code. But fixing the routes is still correct in case it's used in the future. Alternatively, remove `travelApi` entirely. **Decision:** Fix the routes that have backend endpoints, remove the ones that don't.

**Risk:** LOW — `travelApi` is not used by any component currently.

### Commit 8: Run tests and verify

- Run backend tests: `cd backend-python && python -m pytest`
- Run frontend build: `cd frontend && npm run build`
- Verify no regressions

---

## Open Questions

1. **`people` field semantics**: The `TripState.travelers` is a string ("solo", "couple", "family", etc.) but the backend `Trip.people` is an integer. Should we change the backend to accept strings, or map traveler types to integers? **Recommendation:** Change `CreateTripRequest.people` to `str | int = 1` for flexibility, since the model column is `Integer` but we could change it to `String`.

2. **Date parsing in create/update**: `tripState.dates` can be flexible (no specific dates). Need to handle the case where `dates.start` is null/undefined. **Recommendation:** Only set `is_upcoming` and `trip_start_date` when `dates.start` is present and parseable.

3. **`travelApi` dead code**: Should we remove it entirely since it's never imported? **Recommendation:** Fix the routes that exist, remove the ones that don't. Keep the object for future use.
