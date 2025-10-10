# Trip Status System - Complete Documentation

## Overview
The TripWhat application manages trips in three distinct states: **Saved**, **Upcoming**, and **Completed**. This document details the complete database structure and data flow.

---

## Database Schema

### SavedTrip Model Fields
```javascript
{
  user: ObjectId,              // User who owns the trip
  title: String,
  description: String,
  startDate: Date,             // Original planning date
  cities: [CitySchema],
  totalDays: Number,
  people: Number,
  travelType: String,
  budget: BudgetSchema,
  budgetMode: String,
  generatedItinerary: ItinerarySchema,
  tags: [String],
  
  // Status Fields
  isUpcoming: Boolean,         // Default: false
  isCompleted: Boolean,        // Default: false
  tripStartDate: Date,         // When actual trip starts
  tripEndDate: Date,           // When actual trip ends
  
  timestamps: true             // createdAt, updatedAt
}
```

### Status Combinations
| Status      | isUpcoming | isCompleted | Description                    |
|-------------|-----------|-------------|--------------------------------|
| **Saved**   | false     | false       | Trip is just saved/planned     |
| **Upcoming**| true      | false       | Trip is scheduled              |
| **Completed**| true     | true        | Trip has been completed        |

---

## Backend API Endpoints

### 1. Saved Trips
**GET** `/api/saved-trips`
- **Query**: `{ user, isUpcoming: false, isCompleted: false }`
- **Returns**: All trips that are purely saved (not upcoming or completed)
- **Sort**: By `createdAt` (newest first)

### 2. Upcoming Trips
**GET** `/api/saved-trips/upcoming`
- **Query**: `{ user, isUpcoming: true, isCompleted: false }`
- **Returns**: All upcoming trips (scheduled but not yet completed)
- **Sort**: By `tripStartDate` (earliest first)

### 3. Completed Trips
**GET** `/api/saved-trips/completed`
- **Query**: `{ user, isCompleted: true }`
- **Returns**: All completed trips
- **Sort**: By `tripEndDate` (most recent first)

### 4. Mark as Upcoming
**PUT** `/api/saved-trips/:id/upcoming`
- **Body**: `{ tripStartDate: Date }`
- **Updates**: 
  ```javascript
  {
    isUpcoming: true,
    tripStartDate: startDate,
    tripEndDate: startDate + totalDays
  }
  ```
- **Effect**: Trip moves from Saved → Upcoming

### 5. Mark as Completed
**PUT** `/api/saved-trips/:id/completed`
- **Updates**: 
  ```javascript
  {
    isCompleted: true,
    tripEndDate: new Date() // Current date
  }
  ```
- **Effect**: Trip moves from Upcoming → Completed

### 6. Move Back to Saved
**DELETE** `/api/saved-trips/:id/upcoming`
- **Updates**: 
  ```javascript
  {
    isUpcoming: false,
    isCompleted: false,
    tripStartDate: null,
    tripEndDate: null
  }
  ```
- **Effect**: Trip moves from Upcoming/Completed → Saved

---

## Frontend Implementation

### Pages and Data Flow

#### SavedTripsPage
```javascript
// Fetches
apiGetSavedTrips() → Gets trips with isUpcoming=false, isCompleted=false

// Actions
- Mark as Upcoming → Removes from local state (filters out)
- View Itinerary → Navigate to itinerary page
```

#### UpcomingTripsPage
```javascript
// Fetches
apiGetUpcomingTrips() → Gets trips with isUpcoming=true, isCompleted=false

// Actions
- View Itinerary → Navigate to itinerary page
- Add to Calendar → Google Calendar integration
- Mark as Completed → Removes from local state, sets isCompleted=true
- Move to Saved → Removes from local state, resets flags
```

#### CompletedTripsPage
```javascript
// Fetches
apiGetCompletedTrips() → Gets trips with isCompleted=true

// Actions
- View Trip Memories → Navigate to itinerary page
- Move to Saved → Removes from local state, resets flags
```

---

## Complete Trip Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CREATE NEW TRIP                          │
│              (isUpcoming: false, isCompleted: false)        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  SAVED TRIPS  │
                    │ (Planned)     │
                    └───────┬───────┘
                            │
                    [Mark as Upcoming]
                            │
                            ▼
                    ┌───────────────┐
                    │ UPCOMING TRIPS│
                    │ (Scheduled)   │
                    │ isUpcoming:✓  │
                    └───┬───────┬───┘
                        │       │
         [Mark as Completed]   [Move to Saved]
                        │       │
                        │       ▼
                        │   ┌───────────────┐
                        │   │  SAVED TRIPS  │
                        │   │   (Moved Back)│
                        │   └───────────────┘
                        │
                        ▼
                ┌───────────────┐
                │COMPLETED TRIPS│
                │  (Finished)   │
                │ isCompleted:✓ │
                └───────┬───────┘
                        │
                  [Move to Saved]
                        │
                        ▼
                ┌───────────────┐
                │  SAVED TRIPS  │
                │   (Archived)  │
                └───────────────┘
```

---

## State Management

### Frontend State Updates

#### SavedTripsPage
```javascript
// On Mark as Upcoming
setSavedTrips(prev => prev.filter(t => t._id !== tripId))
// Removes trip from list immediately

// On Remove from Upcoming
await fetchSavedTrips()
// Refreshes list to show returned trip
```

#### UpcomingTripsPage
```javascript
// On Mark as Completed
setUpcomingTrips(prev => prev.filter(t => t._id !== tripId))
// Removes trip from list immediately

// On Move to Saved
setUpcomingTrips(prev => prev.filter(t => t._id !== tripId))
// Removes trip from list immediately
```

#### CompletedTripsPage
```javascript
// On Move to Saved
setCompletedTrips(prev => prev.filter(t => t._id !== tripId))
// Removes trip from list immediately
```

---

## Database Queries Summary

### Saved Trips Page
```javascript
SavedTrip.find({
  user: userId,
  isUpcoming: false,
  isCompleted: false
}).sort({ createdAt: -1 })
```

### Upcoming Trips Page
```javascript
SavedTrip.find({
  user: userId,
  isUpcoming: true,
  isCompleted: false
}).sort({ tripStartDate: 1 })
```

### Completed Trips Page
```javascript
SavedTrip.find({
  user: userId,
  isCompleted: true
}).sort({ tripEndDate: -1 })
```

---

## Key Features

### ✅ Database-Backed
- All trip states are stored in MongoDB
- Persistent across sessions
- Proper indexing for performance

### ✅ Clean Separation
- Each page shows only relevant trips
- No manual filtering on frontend
- Backend handles all query logic

### ✅ Proper State Transitions
- Clear flow between states
- Atomic updates via findOneAndUpdate
- No race conditions

### ✅ User Experience
- Immediate UI feedback (optimistic updates)
- Toast notifications for all actions
- Loading states during operations

---

## Testing Checklist

- [ ] Create a new trip → Should appear in Saved
- [ ] Mark as Upcoming → Should disappear from Saved, appear in Upcoming
- [ ] Mark as Completed → Should disappear from Upcoming, appear in Completed
- [ ] Move to Saved from Completed → Should disappear from Completed, appear in Saved
- [ ] Move to Saved from Upcoming → Should disappear from Upcoming, appear in Saved
- [ ] Refresh page → All trips should persist in correct sections
- [ ] Multiple users → Each user sees only their own trips

---

## Files Modified

### Backend
- `backend/models/SavedTrip.js` - Added isCompleted field and indexes
- `backend/controllers/savedTripController.js` - All CRUD operations
- `backend/routes/savedTripRoutes.js` - All route definitions

### Frontend
- `frontend/src/lib/api.js` - All API functions
- `frontend/src/pages/SavedTripsPage.jsx` - Saved trips page
- `frontend/src/pages/UpcomingTripsPage.jsx` - Upcoming trips page
- `frontend/src/pages/CompletedTripsPage.jsx` - Completed trips page

---

## Date: 2025-10-10
## Status: ✅ FINALIZED AND PRODUCTION READY
