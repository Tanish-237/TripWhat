# Plan: Fix Repetitive Itinerary + Trip Persistence on Navigation

> Task: Fix two bugs: (1) same places repeated across itinerary days, (2) trip state lost when navigating away.
> Plan file: `docs/plans/fix-itinerary-and-persistence.md`

## Impact Analysis Summary

| Symbol | File | Direct Callers | Risk |
|--------|------|---------------|------|
| `_search_and_curate_activities` | `itinerary_builder.py` | `_build_single_city`, `_build_multi_city` | CRITICAL (5 processes) — but change is additive (new optional param) |
| `_curate_activities_llm` | `itinerary_builder.py` | `_search_and_curate_activities` | MEDIUM — prompt change only |
| `handleTripStateUpdate` | `NewTripPage.tsx`, `TripWorkspacePage.tsx` | `ChatPanel.processResponse` | LOW — using store method instead of raw API |

---

## Root Causes

### Bug 1: Repetitive itinerary activities
**File:** `backend-python/app/services/itinerary_builder.py`

Each day calls `_search_and_curate_activities` independently. The LLM curation prompt (`_curate_activities_llm`) doesn't know what places were already used on previous days. Since `generate_queries` produces mostly the same queries each day (only one variety query is added for days > 1), the same places appear in search results, and the LLM picks the same top-rated ones (Kuta Beach, Tanah Lot, Livingstone).

**Fix:** Track used place names across days within a single city. Pass them to `_curate_activities_llm` as "already used — avoid these" in the prompt.

### Bug 2: Trip doesn't save when clicking elsewhere
**Files:** `frontend/src/pages/NewTripPage.tsx`, `frontend/src/pages/TripWorkspacePage.tsx`

Both pages use `tripsApi.update()` (raw Axios) in a fire-and-forget async IIFE. When the user navigates away before the save completes, the save is lost. Additionally, `NewTripPage` uses `localTripState` (useState) instead of the Zustand store, so the store doesn't have the latest trip state when navigating to `TripWorkspacePage`.

**Fix:**
1. Use `updateTrip` from the Zustand store instead of `tripsApi.update` directly — this keeps the store in sync
2. In `NewTripPage`, sync `localTripState` to the store via `setTripState` so `TripWorkspacePage` can pick it up
3. Add a `useEffect` cleanup in both pages that flushes any pending save on unmount

---

## Implementation Sequence

### Commit 1: Fix repetitive itinerary — track used places across days

**File:** `backend-python/app/services/itinerary_builder.py`

1. Add `used_names: list[str] | None = None` parameter to `_search_and_curate_activities` and `_curate_activities_llm`
2. In `_curate_activities_llm`, add to prompt:
   ```
   Places already used on previous days (DO NOT repeat these):
   - Kuta Beach, Tanah Lot, ...
   ```
3. In `_build_single_city`, maintain a `used_names` list across the day loop, append each day's activity names
4. In `_build_multi_city`, maintain `used_names` per city (reset when city changes), append each day's activity names

### Commit 2: Fix trip persistence — use store updateTrip + flush on unmount

**File:** `frontend/src/pages/NewTripPage.tsx`
- Replace `tripsApi.update` with `updateTrip` from store
- Add `setTripState` to sync local state to store
- Add `useEffect` cleanup to flush pending saves

**File:** `frontend/src/pages/TripWorkspacePage.tsx`
- Replace `tripsApi.update` with `updateTrip` from store
- Add `useEffect` cleanup to flush pending saves

**File:** `frontend/src/stores/tripStore.ts`
- Add `pendingSave` ref tracking to `updateTrip` for flush-on-unmount support

### Commit 3: Run tests and verify
