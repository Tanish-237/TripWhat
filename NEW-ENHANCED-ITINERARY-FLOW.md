# 🎯 NEW Enhanced Itinerary Generation Flow

**Using OpenAI Web Search + Google Places API**

---

## 🆕 What Changed

### **OLD Approach** (Geoapify/OpenTripMap):
```
User submits → Geoapify API → Get places → Filter by category → Build itinerary
```

### **NEW Approach** (OpenAI + Google Places):
```
User submits → OpenAI Web Search (find top attractions) → 
Filter by popularity & alignment → Google Places API (enrich with details) → 
Calculate distances → Build itinerary
```

---

## 🔄 Complete Flow

### **Step 1: User Completes Wizard**
- Destinations: Paris (3 days), Rome (2 days)
- Travel Type: Cultural
- Budget: $5000
- People: 2

### **Step 2: Frontend Sends Request**
```javascript
POST http://localhost:5000/api/itinerary/generate
{
  "cities": [
    { "name": "Paris", "days": 3 },
    { "name": "Rome", "days": 2 }
  ],
  "travelType": "cultural",
  "people": 2,
  "budget": { "total": 5000, ... }
}
```

### **Step 3: Backend Processing (For Each City)**

#### 3.1 OpenAI Web Search 🌐
**Service**: `openaiWebSearch.findTopAttractions()`

**What it does**:
- Sends prompt to GPT-4o-mini asking for top tourist attractions
- Prompt includes: city name, travel type, preferences, number of attractions needed
- OpenAI searches the web for popular destinations
- Returns structured JSON with attractions

**Example Prompt**:
```
You are an expert travel researcher. Search the web and provide comprehensive 
information about the TOP tourist attractions in Paris.

Travel Context:
- City: Paris
- Travel Type: cultural
- Preferences: museums, historic, architecture
- Required number of attractions: 20

Instructions:
1. Search for the most popular, highest-rated tourist attractions
2. Focus on attractions that match "cultural" travel style
3. Include diverse mix: landmarks, museums, parks, restaurants
4. Prioritize attractions that are iconic and unique to Paris

Return ONLY valid JSON:
{
  "city": "Paris",
  "country": "France",
  "attractions": [
    {
      "name": "Louvre Museum",
      "description": "World's largest art museum",
      "category": "museum",
      "popularity": "very_high",
      "mustVisit": true,
      "estimatedDuration": "3-4 hours",
      "bestTimeToVisit": "Early morning to avoid crowds",
      "tags": ["iconic", "art", "cultural", "instagram-worthy"]
    },
    ...
  ],
  "localTips": ["Book tickets online", "Visit on weekdays"],
  "bestSeason": "Spring or Fall"
}
```

**Output**: 20-30 attractions with descriptions, categories, popularity ratings

---

#### 3.2 Filter by Alignment 🎯
**Service**: `openaiWebSearch.filterByAlignment()`

**What it does**:
- Filters attractions based on user preferences and travel type
- Sorts by: must-visit → popularity → tag matching
- Removes attractions that don't match travel style

**Logic**:
```typescript
attractions.filter(attr => {
  // Always keep must-visit
  if (attr.mustVisit) return true;
  
  // Check if tags match preferences
  const hasMatchingTag = attr.tags.includes("cultural");
  
  // Check if category matches travel type
  const categoryMatch = attr.category === "museum";
  
  return hasMatchingTag || categoryMatch;
})
.sort((a, b) => {
  if (a.mustVisit !== b.mustVisit) return a.mustVisit ? -1 : 1;
  if (a.popularity !== b.popularity) return popOrder[b] - popOrder[a];
})
```

**Output**: Top 15-20 filtered attractions

---

#### 3.3 Enrich with Google Places 📍
**Service**: `googlePlacesAPI.searchPlaces()` + `getPlaceDetails()`

**What it does**:
For each attraction from web search:
1. Search Google Places API: `"Louvre Museum Paris"`
2. Get place details (photos, hours, ratings, address)
3. Extract ticket price estimate
4. Get photo URLs
5. Get opening hours

**API Calls**:
```typescript
// Search for place
POST https://places.googleapis.com/v1/places:searchText
{
  "textQuery": "Louvre Museum Paris",
  "locationBias": {
    "circle": { "center": { "latitude": 48.8566, "longitude": 2.3522 }, "radius": 50000 }
  }
}

// Response includes:
{
  "places": [{
    "id": "ChIJD3uTd9hx5kcR1IQvGfr8dbk",
    "displayName": { "text": "Louvre Museum" },
    "formattedAddress": "Rue de Rivoli, 75001 Paris",
    "location": { "latitude": 48.8606, "longitude": 2.3376 },
    "rating": 4.7,
    "userRatingCount": 285432,
    "priceLevel": "PRICE_LEVEL_MODERATE",
    "regularOpeningHours": {
      "weekdayDescriptions": ["Monday: 9:00 AM – 6:00 PM", ...],
      "openNow": true
    },
    "photos": [{
      "name": "places/ChIJ.../photos/ABC123",
      "widthPx": 4000,
      "heightPx": 3000
    }],
    "editorialSummary": { "text": "Iconic art museum..." },
    "websiteUri": "https://www.louvre.fr",
    "internationalPhoneNumber": "+33 1 40 20 50 50"
  }]
}
```

**Enriched Place Structure**:
```typescript
{
  webSearchData: {
    name: "Louvre Museum",
    description: "World's largest art museum",
    category: "museum",
    popularity: "very_high",
    mustVisit: true,
    estimatedDuration: "3-4 hours",
    tags: ["iconic", "art", "cultural"]
  },
  googlePlaceData: {
    id: "ChIJ...",
    displayName: "Louvre Museum",
    location: { latitude: 48.8606, longitude: 2.3376 },
    rating: 4.7,
    formattedAddress: "Rue de Rivoli, 75001 Paris"
  },
  photoUrl: "https://places.googleapis.com/v1/places/.../photos/.../media?maxWidth=800&key=...",
  openingHours: {
    isOpen: true,
    schedule: ["Mon: 9AM-6PM", "Tue: 9AM-6PM", ...]
  },
  ticketPrice: "$15-25",
  distance: null  // Will be calculated next
}
```

**Output**: 15-20 enriched places with photos, hours, prices

---

#### 3.4 Calculate Distances 📏
**Service**: `googlePlacesAPI.calculateDistance()`

**What it does**:
- Uses Google Distance Matrix API
- Calculates walking distance/time between consecutive places
- Used for route optimization

**API Call**:
```
GET https://maps.googleapis.com/maps/api/distancematrix/json
?origins=48.8606,2.3376
&destinations=48.8529,2.3499
&key=API_KEY
&mode=walking

Response:
{
  "rows": [{
    "elements": [{
      "distance": { "text": "1.2 km", "value": 1200 },
      "duration": { "text": "15 mins", "value": 900 }
    }]
  }]
}
```

**Output**: Places with distance/time to next place

---

#### 3.5 Build Daily Plans 📅
**Service**: `enhancedItineraryBuilder.buildDailyPlans()`

**What it does**:
- Calculates activities per day based on pacing
- Distributes places across days and time slots
- Separates attractions from restaurants
- Adds local tips

**Logic**:
```typescript
// Pacing: moderate, Activity level: medium
activitiesPerDay = {
  morning: 2,
  afternoon: 2,
  evening: 1 (restaurant)
};

// Day 1
timeSlots = [
  {
    period: 'morning',
    startTime: '09:00',
    endTime: '12:00',
    activities: [place[0], place[1]]  // First 2 attractions
  },
  {
    period: 'afternoon',
    startTime: '14:00',
    endTime: '18:00',
    activities: [place[2], place[3]]  // Next 2 attractions
  },
  {
    period: 'evening',
    startTime: '19:00',
    endTime: '22:00',
    activities: [restaurant[0]]  // 1 restaurant
  }
];
```

**Output**: Complete itinerary with days, time slots, activities

---

## 📊 API Calls Summary

For **Paris (3 days) + Rome (2 days)**:

| Step | Service | API | Calls | Purpose |
|------|---------|-----|-------|---------|
| 1 | OpenAI Web Search | OpenAI API | 2 | Find attractions (1 per city) |
| 2 | Enrich Places | Google Places Text Search | ~40 | Search each attraction (20 per city) |
| 3 | Get Photos | Google Places Photos | ~40 | Get photo URLs (1 per place) |
| 4 | Calculate Distances | Google Distance Matrix | ~38 | Distance between places |

**Total API Calls**: ~120 (60 per city)

---

## 🎯 Key Advantages

### 1. **Better Attraction Quality**
- ❌ OLD: Limited to OpenTripMap/Geoapify database
- ✅ NEW: Web search finds latest, most popular attractions

### 2. **Rich Details**
- ❌ OLD: Basic info (name, location, category)
- ✅ NEW: Photos, hours, prices, phone, website, ratings

### 3. **Popularity-Based Selection**
- ❌ OLD: Random/category-based selection
- ✅ NEW: Must-visit attractions prioritized, sorted by popularity

### 4. **Better Alignment**
- ❌ OLD: Simple category matching
- ✅ NEW: AI understands travel style, filters by alignment

### 5. **Distance Optimization**
- ❌ OLD: No distance calculation
- ✅ NEW: Shows walking time between places

---

## 🔧 Configuration

### Required Environment Variables

```bash
# backend/.env
OPENAI_API_KEY=sk-proj-...  # For web search
GOOGLE_PLACES_API_KEY=AIza...  # For place details + photos + distance
```

### Cost Estimation

**OpenAI API**:
- Model: GPT-4o-mini
- ~1000 tokens per city
- Cost: ~$0.0003 per city
- **Total**: $0.0006 for 2 cities

**Google Places API**:
- Text Search: $32/1000 requests → ~40 calls = $1.28
- Photos: Free (up to 100,000/month)
- Distance Matrix: $5/1000 requests → ~38 calls = $0.19
- **Total**: ~$1.47 per itinerary

**Grand Total**: ~$1.47 per generated itinerary

*(Much cheaper than expected! Google gives $200 free credit/month)*

---

## 🚀 How to Test

### 1. Set up API keys
```bash
cd backend
cp .env.example .env
# Edit .env and add:
OPENAI_API_KEY=your_key_here
GOOGLE_PLACES_API_KEY=your_key_here
```

### 2. Install new dependencies
```bash
npm install axios uuid zod
```

### 3. Start servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Test the flow
1. Go to `http://localhost:5173`
2. Complete wizard: Destinations → Preferences → Budget
3. Click "Continue to Results"
4. Watch console logs:
   ```
   🎯 [ENHANCED ITINERARY] Generating with OpenAI web search + Google Places API
   🌐 [WEB SEARCH] Processing Paris (3 days)
   🌐 [WEB SEARCH] Finding attractions in Paris for cultural travel
   ✅ [WEB SEARCH] Found 25 attractions in Paris
   📍 [GOOGLE PLACES] Enriched 18 places with photos, hours, prices
   ✅ Generated 3 days for Paris
   ```

---

## 🔍 Debugging

### Enable detailed logs
```typescript
// backend/src/services/openaiWebSearch.ts
console.log('🌐 [WEB SEARCH] Prompt:', prompt);
console.log('🌐 [WEB SEARCH] Response:', content);

// backend/src/services/googlePlacesAPI.ts
console.log('📍 [GOOGLE] Searching:', query);
console.log('📍 [GOOGLE] Found:', places.length);
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No attractions found" | OpenAI API key missing | Add OPENAI_API_KEY to .env |
| "Failed to enrich places" | Google API key missing | Add GOOGLE_PLACES_API_KEY to .env |
| "Invalid JSON from OpenAI" | Model output format | Check prompt in openaiWebSearch.ts |
| Rate limit errors | Too many requests | Add delays or caching |

---

## 📝 File Changes Summary

### New Files Created:
1. **`backend/src/services/googlePlacesAPI.ts`** (240 lines)
   - Google Places API integration
   - Text Search, Place Details, Photos, Distance Matrix

2. **`backend/src/services/openaiWebSearch.ts`** (180 lines)
   - OpenAI web search for attractions
   - Filtering by alignment and popularity

3. **`backend/src/services/enhancedItineraryBuilder.ts`** (350 lines)
   - Orchestrates: Web Search → Google Places → Build Itinerary
   - Main entry point for new flow

### Modified Files:
1. **`backend/src/agents/travel-agent.ts`**
   - Updated `generateItineraryWithContext()` to use enhanced builder
   - Old method renamed to `generateItineraryWithContext_OLD()`

2. **`backend/src/types/itinerary.ts`**
   - Added new fields: `travelType`, `localTips`, `bestSeason`
   - Extended `Activity` interface with: `tags`, `openingHours`, `isOpen`, `websiteUrl`, `distanceToNext`, `mustVisit`
   - Extended `DayPlan` with: `localTip`, `city`

---

## 🎉 Result

Users now get itineraries with:
- ✅ **Top-rated attractions** (web-searched, popularity-sorted)
- ✅ **Real photos** (Google Places)
- ✅ **Opening hours** ("Mon: 9AM-6PM")
- ✅ **Ticket prices** ("$15-25" or "Free")
- ✅ **Ratings** (4.7/5 stars)
- ✅ **Walking distances** ("500m, 7 min walk")
- ✅ **Local tips** (from web search)
- ✅ **Must-visit labels**
- ✅ **Website & phone numbers**

**Much better than the old Geoapify-only approach!** 🚀
