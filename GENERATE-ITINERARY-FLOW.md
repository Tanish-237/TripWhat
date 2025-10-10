# 🎯 Generate Itinerary Button Flow

**Exact execution path when user clicks "Generate Itinerary" after filling preferences**

---

## 📋 User Journey Recap

```
Step 1: /plan (Destinations)
  └─ Select: Paris (3 days), Rome (2 days), start date

Step 2: /plan/preferences  
  └─ Select: 2 people, travel type = "cultural"

Step 3: /plan/budget
  └─ Set: $5000 total, allocate percentages
  └─ Click "Continue to Results" ← TRIGGERS FLOW

Step 4: /plan/results
  └─ Auto-generates itinerary on mount
```

---

## 🔄 Complete Execution Flow

### **FRONTEND START**

#### 1. BudgetPage Button Click

**File**: `frontend/src/pages/BudgetPage.jsx` (Line 310)

```javascript
const handleNext = () => {
  // Save budget to context
  updateTripData({ 
    budget: budget,
    budgetMode: budgetMode 
  });
  
  // Navigate to results
  navigate('/plan/results');  // ← GO TO STEP 2
};
```

---

#### 2. ResultsPage Mounts & Auto-Generates

**File**: `frontend/src/pages/ResultsPage.jsx` (Line 32-134)

```javascript
useEffect(() => {
  // VALIDATION
  const hasCore = tripData?.startDate && tripData?.cities?.length > 0;
  const hasPrefs = tripData?.people && tripData?.travelType;
  const hasBudget = tripData?.budget !== undefined;
  
  if (!hasCore || !hasPrefs || !hasBudget) {
    return; // Don't generate if missing data
  }
  
  // BUILD PAYLOAD
  const payload = {
    startDate: tripData.startDate,
    cities: tripData.cities.map((c, idx) => ({
      id: c.id,
      name: c.name,
      days: c.days,
      order: idx + 1
    })),
    people: tripData.people,
    travelType: tripData.travelType,
    budget: {
      total: tripData.budget.total,
      travel: tripData.budget.travel,
      accommodation: tripData.budget.accommodation,
      food: tripData.budget.food,
      events: tripData.budget.events
    },
    budgetMode: tripData.budgetMode || 'capped'
  };
  
  // API CALL
  const response = await axios.post(
    'http://localhost:5000/api/itinerary/generate',  // ← GO TO BACKEND
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  // STORE RESULT
  setGeneratedItinerary(response.data);
  updateTripData({
    generatedItinerary: response.data,
    itineraryMarkdown: response.data.markdown
  });
  
}, []); // Runs once on mount
```

**Payload Example**:
```json
{
  "startDate": "2024-06-15T00:00:00.000Z",
  "cities": [
    { "id": "1", "name": "Paris", "days": 3, "order": 1 },
    { "id": "2", "name": "Rome", "days": 2, "order": 2 }
  ],
  "people": 2,
  "travelType": "cultural",
  "budget": {
    "total": 5000,
    "travel": 25,
    "accommodation": 25,
    "food": 25,
    "events": 25
  },
  "budgetMode": "capped"
}
```

---

### **BACKEND START**

#### 3. Express Route Handler

**File**: `backend/src/routes/itinerary.ts` (Line 11-79)

```typescript
router.post('/generate', async (req, res) => {
  const tripContext: TripContext = req.body;
  
  // VALIDATION
  if (!tripContext.cities || tripContext.cities.length === 0) {
    return res.status(400).json({ error: 'Destination required' });
  }
  // ... more validation
  
  console.log('📋 Generating itinerary with context:', {
    cities: tripContext.cities.map(c => `${c.name} (${c.days}d)`),
    budget: `$${tripContext.budget.total}`,
    people: tripContext.people,
    travelType: tripContext.travelType
  });
  
  // CREATE AGENT
  const agent = new TravelAgent();
  
  // CALL GENERATION METHOD ← GO TO STEP 4
  const result = await agent.generateItineraryWithContext(tripContext);
  
  // RETURN RESPONSE
  res.json({
    success: true,
    markdown: result.response,
    itinerary: result.itinerary,
    context: tripContext
  });
});
```

---

#### 4. TravelAgent.generateItineraryWithContext()

**File**: `backend/src/agents/travel-agent.ts` (Line 620-798)

**THIS IS THE MAIN ORCHESTRATION METHOD**

```typescript
async generateItineraryWithContext(tripContext: TripContext) {
  console.log('🎯 Generating context-aware itinerary');
  
  // STEP A: Calculate daily budget
  const totalDays = tripContext.cities.reduce((sum, city) => sum + city.days, 0);
  const dailyBudget = {
    totalPerDay: tripContext.budget.total / totalDays,
    activities: (tripContext.budget.events / 100) * (budget.total / totalDays),
    accommodation: (tripContext.budget.accommodation / 100) * (budget.total / totalDays),
    food: (tripContext.budget.food / 100) * (budget.total / totalDays),
    travel: (tripContext.budget.travel / 100) * (budget.total / totalDays)
  };
  
  // STEP B: Get travel preferences based on type
  const travelPrefs = this.getTravelTypePreferences(tripContext.travelType);
  // Returns: { categories: ['museums', 'historic'], activityLevel: 'medium', pacing: 'moderate' }
  
  // STEP C: Fetch places for each city
  const allCityPlaces = new Map();
  
  for (const city of tripContext.cities) {
    console.log(`📍 Fetching places for ${city.name}`);
    
    // C1: Geocode city name → coordinates
    const coords = await itineraryBuilder.getDestinationCoords(city.name);
    //     ↓ CALLS: geoapifyAPI.geocode(cityName)
    //     ↓ API: GET https://api.geoapify.com/v1/geocode/search?text=Paris
    
    if (!coords) continue;
    
    // C2: Fetch enhanced places
    const cityPlaces = await itineraryBuilder.fetchEnhancedPlaces(
      coords.lat,
      coords.lon,
      travelPrefs.categories,      // ['museums', 'historic', 'architecture']
      tripContext.travelType,       // 'cultural'
      true                          // includeHotels
    );
    //     ↓ GO TO STEP 5
    
    allCityPlaces.set(city.name, {
      places: cityPlaces,
      coords: coords,
      days: city.days
    });
  }
  
  // STEP D: Build daily plans
  const allDays = [];
  let currentDayNumber = 1;
  const globalUsedPlaces = new Set(); // Track used places across ALL days
  
  for (const city of tripContext.cities) {
    const cityData = allCityPlaces.get(city.name);
    
    console.log(`🗓️ Building ${city.days} days for ${city.name}`);
    
    // D1: Build city-specific itinerary
    const cityItinerary = await itineraryBuilder.buildItineraryWithContextAndState(
      city.name,
      city.days,
      {
        dailyBudget: dailyBudget.activities,
        preferredCategories: travelPrefs.categories,
        activityLevel: travelPrefs.activityLevel,
        pacing: travelPrefs.pacing,
        numberOfPeople: tripContext.people,
        places: cityData.places,
        coords: cityData.coords,
        globalUsedPlaces: globalUsedPlaces,  // Shared across all cities
        startingDayNumber: currentDayNumber
      }
    );
    //     ↓ GO TO STEP 6
    
    // D2: Add days to complete itinerary
    cityItinerary.days.forEach(day => {
      day.city = city.name;
      allDays.push(day);
    });
    
    currentDayNumber += city.days;
  }
  
  // STEP E: Format response
  const completeItinerary = {
    tripMetadata: {
      destination: tripContext.cities.map(c => c.name).join(' → '),
      duration: totalDays,
      startDate: tripContext.startDate,
      travelType: tripContext.travelType,
      numberOfPeople: tripContext.people,
      budget: { total, perDay, breakdown }
    },
    days: allDays
  };
  
  const formattedResponse = this.formatItineraryWithContext(completeItinerary);
  
  return {
    response: formattedResponse,  // Markdown
    itinerary: completeItinerary, // Structured JSON
    error: null
  };
}
```

---

#### 5. ItineraryBuilder.fetchEnhancedPlaces()

**File**: `backend/src/services/itineraryBuilder.ts` (Line 459-530)

**PURPOSE**: Fetch activities, restaurants, and hotels for a city

```typescript
async fetchEnhancedPlaces(
  lat: number,
  lon: number,
  preferredCategories: string[],
  travelType: 'cultural' | 'leisure' | ...,
  includeHotels: boolean
) {
  // STEP 1: Enhance categories based on travel type
  const enhancedCategories = this.getEnhancedCategoriesForTravelType(
    travelType, 
    preferredCategories
  );
  // Input: ['museums'], travelType: 'cultural'
  // Output: ['museums', 'historic', 'architecture', 'theatres', 'religion']
  
  console.log(`🎯 Enhanced categories for ${travelType}:`, enhancedCategories);
  
  // STEP 2: Fetch attractions from Geoapify
  const basePlaces = await this.geoapifyAPI.getItineraryPlaces(lat, lon, 15000);
  //     ↓ API CALL
  //     GET https://api.geoapify.com/v2/places
  //     ?categories=tourism.attraction,tourism.sights
  //     &filter=circle:2.3522,48.8566,15000
  //     &limit=50
  //     &apiKey=7d06f2a2a0ee4d038ef6a93bf4436f38
  //
  //     RETURNS: { attractions: [...], restaurants: [...] }
  
  // STEP 3: Fetch hotels separately
  let hotels = [];
  if (includeHotels) {
    hotels = await this.geoapifyAPI.searchByCategory(
      lat, lon, 'accomodations', 10000, 10
    );
    //     ↓ API CALL
    //     GET https://api.geoapify.com/v2/places
    //     ?categories=accommodation.hotel
    //     &filter=circle:2.3522,48.8566,10000
    //     &limit=10
  }
  
  // STEP 4: Filter activities by enhanced categories
  const activities = basePlaces.attractions.filter(place => {
    const placeCategories = place.category.map(c => c.toLowerCase());
    return enhancedCategories.some(pref => 
      placeCategories.some(cat => 
        cat.includes(pref.toLowerCase()) || 
        pref.toLowerCase().includes(cat)
      )
    );
  });
  
  const restaurants = basePlaces.restaurants;
  
  // STEP 5: Categorize for better distribution
  const byCategory = new Map();
  activities.forEach(p => {
    const cat = p.category[0] || 'other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(p);
  });
  
  return {
    activities: activities,      // Filtered tourist attractions
    restaurants: restaurants,     // Dining options
    hotels: hotels,              // Accommodation
    byCategory: byCategory,      // Organized by type
    total: activities.length + restaurants.length + hotels.length
  };
}
```

**Example Output**:
```javascript
{
  activities: [
    { name: "Louvre Museum", category: ["museum", "cultural"], ... },
    { name: "Notre-Dame", category: ["church", "historic"], ... },
    { name: "Arc de Triomphe", category: ["monument"], ... }
  ],
  restaurants: [
    { name: "Le Comptoir", category: ["restaurant"], ... }
  ],
  hotels: [
    { name: "Hotel Paris", category: ["hotel"], ... }
  ],
  byCategory: Map {
    'museum' => [Louvre, Orsay],
    'church' => [Notre-Dame],
    'monument' => [Arc de Triomphe]
  },
  total: 73
}
```

---

#### 6. ItineraryBuilder.buildItineraryWithContextAndState()

**File**: `backend/src/services/itineraryBuilder.ts` (Line 145-220)

**PURPOSE**: Build N days of activities for a city with budget awareness

```typescript
async buildItineraryWithContextAndState(
  city: string,
  days: number,
  context: {
    dailyBudget: number,           // $714 per day
    preferredCategories: string[], // ['museums', 'historic']
    activityLevel: string,         // 'medium'
    pacing: string,                // 'moderate'
    numberOfPeople: number,        // 2
    places: { activities, restaurants, hotels },
    globalUsedPlaces: Set<string>, // Shared across all days
    startingDayNumber: number      // 1 for first city, 4 for second city, etc.
  }
): Promise<Itinerary> {
  
  let budgetRemaining = context.dailyBudget * context.numberOfPeople;
  
  // STEP 1: Calculate activities per time slot
  const activitiesPerDay = this.calculateActivitiesPerDay(
    context.pacing,
    context.activityLevel
  );
  // Returns: { morning: 2, afternoon: 2, evening: 1 }
  
  // STEP 2: Build each day
  const dayPlans = [];
  
  for (let dayNum = 0; dayNum < days; dayNum++) {
    const absoluteDayNumber = context.startingDayNumber + dayNum;
    
    // STEP 3: Build single day plan
    const dayPlan = this.buildOptimizedDayPlan(
      absoluteDayNumber,
      context.places,
      context.dailyBudget,
      activitiesPerDay,
      context.numberOfPeople,
      context.globalUsedPlaces  // ← Global tracking prevents repetition
    );
    //     ↓ GO TO STEP 7
    
    dayPlans.push(dayPlan);
  }
  
  return {
    id: uuidv4(),
    tripMetadata: { destination: city, duration: days },
    days: dayPlans
  };
}
```

---

#### 7. ItineraryBuilder.buildOptimizedDayPlan()

**File**: `backend/src/services/itineraryBuilder.ts` (Line 224-415)

**PURPOSE**: Build a single day with morning/afternoon/evening activities

```typescript
private buildOptimizedDayPlan(
  dayNumber: number,
  places: { activities, restaurants, hotels },
  dailyBudget: number,
  activitiesPerDay: { morning: 2, afternoon: 2, evening: 1 },
  numberOfPeople: number,
  globalUsedPlaces: Set<string>
): DayPlan {
  
  let budgetRemaining = dailyBudget * numberOfPeople;
  
  // STEP 1: Separate activities from restaurants
  const activities = places.activities || [];
  const restaurants = places.restaurants || [];
  const hotels = places.hotels || [];
  
  // STEP 2: Shuffle with day-specific seed (consistent per day)
  const shuffledActivities = this.shuffleArrayWithSeed([...activities], dayNumber);
  const shuffledRestaurants = this.shuffleArrayWithSeed([...restaurants], dayNumber * 2);
  const shuffledHotels = this.shuffleArrayWithSeed([...hotels], dayNumber * 3);
  
  // STEP 3: Helper to select places with budget + uniqueness check
  const selectPlaces = (count: number, sourceArray: Destination[]) => {
    const selected = [];
    
    for (const place of sourceArray) {
      if (selected.length >= count) break;
      
      const placeId = `${place.name}-${place.location.latitude}-${place.location.longitude}`;
      
      // CHECK: Already used globally?
      if (globalUsedPlaces.has(placeId)) continue;
      
      // CHECK: Can we afford it?
      const cost = this.estimateCost(place.category) * numberOfPeople;
      if (budgetRemaining < cost && cost > 0) continue;
      
      // ADD: This place is selected
      selected.push(place);
      globalUsedPlaces.add(placeId);  // ← Mark as used globally
      budgetRemaining -= cost;
    }
    
    return selected;
  };
  
  // STEP 4: Generate day title
  const dayTitles = [
    'Arrival & First Impressions',
    'City Discovery',
    'Cultural Journey',
    'Local Adventures',
    'Hidden Treasures'
  ];
  const title = dayTitles[Math.min(dayNumber - 1, dayTitles.length - 1)];
  
  // STEP 5: Build time slots
  const timeSlots = [
    this.buildTimeSlot(
      'morning',
      '09:00',
      '12:00',
      selectPlaces(activitiesPerDay.morning, shuffledActivities)
    ),
    this.buildTimeSlot(
      'afternoon',
      '14:00',
      '18:00',
      selectPlaces(activitiesPerDay.afternoon, shuffledActivities)
    ),
    this.buildTimeSlot(
      'evening',
      '19:00',
      '22:00',
      selectPlaces(activitiesPerDay.evening, shuffledRestaurants)
    )
  ];
  
  // STEP 6: Add hotel on Day 1 or every 3 days
  if (dayNumber === 1 || dayNumber % 3 === 1) {
    const hotelRecommendations = selectPlaces(1, shuffledHotels);
    if (hotelRecommendations.length > 0) {
      timeSlots.push(this.buildTimeSlot(
        'night',
        '22:00',
        '23:59',
        hotelRecommendations
      ));
    }
  }
  
  return {
    dayNumber,
    title,
    timeSlots
  };
}
```

**Example Day Plan**:
```json
{
  "dayNumber": 1,
  "title": "Arrival & First Impressions",
  "timeSlots": [
    {
      "period": "morning",
      "startTime": "09:00",
      "endTime": "12:00",
      "activities": [
        { "name": "Louvre Museum", "duration": "2-3h", "estimatedCost": "$20" },
        { "name": "Tuileries Garden", "duration": "1h", "estimatedCost": "Free" }
      ]
    },
    {
      "period": "afternoon",
      "startTime": "14:00",
      "endTime": "18:00",
      "activities": [
        { "name": "Notre-Dame", "duration": "1h", "estimatedCost": "Free" },
        { "name": "Sainte-Chapelle", "duration": "1h", "estimatedCost": "$15" }
      ]
    },
    {
      "period": "evening",
      "startTime": "19:00",
      "endTime": "22:00",
      "activities": [
        { "name": "Le Comptoir", "duration": "1.5h", "estimatedCost": "$35" }
      ]
    },
    {
      "period": "night",
      "startTime": "22:00",
      "endTime": "23:59",
      "activities": [
        { "name": "Hotel Paris", "estimatedCost": "$120/night" }
      ]
    }
  ]
}
```

---

### **BACKEND END**

#### 8. Return to Route Handler

**File**: `backend/src/routes/itinerary.ts` (Line 67-72)

```typescript
// After agent.generateItineraryWithContext() returns

res.json({
  success: true,
  markdown: result.response,      // Formatted markdown string
  itinerary: result.itinerary,    // Structured JSON
  context: tripContext            // Original request
});
```

---

### **FRONTEND END**

#### 9. ResultsPage Receives Response

**File**: `frontend/src/pages/ResultsPage.jsx` (Line 114-121)

```javascript
const response = await axios.post('http://localhost:5000/api/itinerary/generate', ...);

console.log('✅ AI Itinerary generated:', response.data);
setGeneratedItinerary(response.data);

updateTripData({
  generatedItinerary: response.data,
  itineraryMarkdown: response.data.markdown
});
```

---

## 📊 API Calls Summary

When generating itinerary for **Paris (3 days) + Rome (2 days)**:

| Step | API | Endpoint | Purpose |
|------|-----|----------|---------|
| 1 | Geoapify | `GET /v1/geocode/search?text=Paris` | Get coordinates for Paris |
| 2 | Geoapify | `GET /v2/places?categories=tourism.attraction&filter=circle:2.35,48.85,15000` | Get attractions in Paris |
| 3 | Geoapify | `GET /v2/places?categories=accommodation.hotel&filter=circle:2.35,48.85,10000` | Get hotels in Paris |
| 4 | Geoapify | `GET /v1/geocode/search?text=Rome` | Get coordinates for Rome |
| 5 | Geoapify | `GET /v2/places?categories=tourism.attraction&filter=circle:12.49,41.90,15000` | Get attractions in Rome |
| 6 | Geoapify | `GET /v2/places?categories=accommodation.hotel&filter=circle:12.49,41.90,10000` | Get hotels in Rome |

**Total API Calls**: `2 × number of cities × 2` (geocode + places for each city)

---

## 🔑 Key Functions Called (In Order)

```
1. ResultsPage.useEffect()
2. axios.post('/api/itinerary/generate')
   ↓
3. router.post('/generate') [itinerary.ts]
4. TravelAgent.generateItineraryWithContext()
   ├─ getTravelTypePreferences()
   ├─ For each city:
   │  ├─ ItineraryBuilder.getDestinationCoords()
   │  │  └─ geoapifyAPI.geocode()                    ← API CALL
   │  ├─ ItineraryBuilder.fetchEnhancedPlaces()
   │  │  ├─ getEnhancedCategoriesForTravelType()
   │  │  ├─ geoapifyAPI.getItineraryPlaces()        ← API CALL
   │  │  └─ geoapifyAPI.searchByCategory()          ← API CALL
   │  └─ ItineraryBuilder.buildItineraryWithContextAndState()
   │     ├─ calculateActivitiesPerDay()
   │     └─ For each day:
   │        └─ buildOptimizedDayPlan()
   │           ├─ shuffleArrayWithSeed()
   │           ├─ selectPlaces() [with budget + uniqueness check]
   │           └─ buildTimeSlot()
   └─ formatItineraryWithContext()
   ↓
5. Return response to frontend
6. Display itinerary
```

---

## 🎯 Key Decisions Made

### 1. **Travel Type → Categories**
```javascript
travelType: 'cultural'
  ↓
categories: ['museums', 'historic', 'architecture', 'theatres', 'religion']
```

### 2. **Pacing → Activities Per Day**
```javascript
pacing: 'moderate', activityLevel: 'medium'
  ↓
{ morning: 2, afternoon: 2, evening: 1 }
```

### 3. **Budget → Place Selection**
```javascript
dailyBudget: $714 for 2 people
activity cost: $20/person = $40 total
budgetRemaining: $714 - $40 = $674 ✅ APPROVED
```

### 4. **Global Place Tracking**
```javascript
globalUsedPlaces = Set(['Louvre-48.86-2.34', 'Notre-Dame-48.85-2.35'])
  ↓
Louvre already used in Day 1 → Skip for Day 2
```

---

## 🚨 This Flow Does NOT Use:

❌ **LangGraph state machine** (that's for chat)
❌ **Intent detection** (that's for chat)
❌ **Tool executor node** (that's for chat)
❌ **Planner node** (that's for chat)

✅ **It DOES use**:
- Direct method calls
- Geoapify Places API
- Budget-aware selection algorithm
- Global place tracking

---

**This is the ACTUAL flow for the "Generate Itinerary" button!** 🎉
