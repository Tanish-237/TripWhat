# 🗺️ Itinerary View Setup Guide

## ✅ What Was Built

A **Mindtrip-inspired itinerary view** with:
- ✅ Split-screen layout (sidebar + main content)
- ✅ Day-by-day timeline with activities
- ✅ Interactive map with activity markers
- ✅ Beautiful activity cards with images
- ✅ Tab navigation (Itinerary / Map / Calendar)
- ✅ Responsive design

---

## 📦 Installation Steps

### 1. Install Mapbox GL

```bash
cd frontend
npm install mapbox-gl
```

### 2. Get Free Mapbox Token

1. Go to https://www.mapbox.com/
2. Sign up for free account
3. Go to "Access tokens" section
4. Copy your default public token

### 3. Add Environment Variable

Create or update `frontend/.env`:

```env
VITE_MAPBOX_TOKEN=pk.your_token_here
```

**Note:** The app includes a fallback public token for testing, but you should use your own.

---

## 🚀 How to Test

### 1. Start Both Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 2. Complete the Flow

1. **Login:** `http://localhost:5173/login`
2. **Onboarding:** Add cities (e.g., Paris 3d, Rome 4d)
3. **Preferences:** Select travelers & travel type
4. **Budget:** Set budget amount & distribution
5. **Results Page:** Wait for AI to generate itinerary
6. **Click "View Itinerary"** → Opens ItineraryPage

### 3. Explore Features

**Left Sidebar:**
- Trip overview with stats
- Day selector
- Quick navigation
- Share & save buttons

**Main Content Area:**
- **Itinerary Tab:** Day-by-day timeline
  - Time periods (Morning/Afternoon/Evening)
  - Activity cards with images
  - Duration, cost, and navigation info
  - Previous/Next day buttons

- **Map Tab:** Interactive map
  - Blue markers for each activity
  - Click markers to see details
  - Auto-zoom to fit all markers

- **Calendar Tab:** Grid view of all days
  - Quick overview
  - Click any day to jump to itinerary

---

## 🎨 Features

### Timeline View
- **Activity Cards:**
  - High-quality images (from Unsplash)
  - Activity name, category, description
  - Duration, estimated cost
  - "Get Directions" button
  - Heart icon to save favorites

- **Time Periods:**
  - Color-coded badges (Morning/Afternoon/Evening)
  - Start and end times
  - Visual timeline connector

### Map Integration
- **Mapbox GL JS**
  - Street maps style
  - Custom markers for activities
  - Popups on click
  - Auto-fit bounds

### Navigation
- **Day Selector:**
  - Shows all days
  - Highlights selected day
  - Shows activity count per day
  - Quick jump to any day

---

## 📂 File Structure

```
frontend/src/pages/
├── ItineraryPage.jsx     # Main itinerary view component
├── ResultsPage.jsx       # Updated to navigate to /itinerary
└── ...

frontend/src/
└── App.jsx              # Added /itinerary route

backend/
└── (no changes needed)
```

---

## 🔄 Data Flow

### From Results to Itinerary

1. **ResultsPage generates itinerary:**
   ```javascript
   const response = await POST('/api/itinerary/generate', tripContext);
   setGeneratedItinerary(response.data);
   updateTripData({ 
     generatedItinerary: response.data,
     itineraryMarkdown: response.data.markdown 
   });
   ```

2. **User clicks "View Itinerary":**
   ```javascript
   navigate("/itinerary");
   ```

3. **ItineraryPage loads data from context:**
   ```javascript
   const itinerary = tripData?.generatedItinerary?.itinerary;
   ```

### Itinerary Data Structure

```typescript
{
  tripMetadata: {
    destination: "Paris → Rome",
    duration: 7,
    numberOfPeople: 2,
    travelType: "leisure",
    budget: {
      total: 5000,
      perDay: 714,
      breakdown: { ... }
    }
  },
  days: [
    {
      dayNumber: 1,
      title: "Day 1",
      city: "Paris",
      timeSlots: [
        {
          period: "morning",
          startTime: "09:00",
          endTime: "12:00",
          activities: [
            {
              id: "...",
              name: "Eiffel Tower",
              category: "monument",
              duration: "2-3h",
              estimatedCost: "$25",
              description: "...",
              imageUrl: "...",
              location: { lat: 48.858, lon: 2.294 }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🎯 Mapbox Features Used

### Basic Setup
```javascript
mapboxgl.accessToken = 'your_token';

const map = new mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [2.3522, 48.8566],
  zoom: 5
});
```

### Adding Markers
```javascript
const marker = new mapboxgl.Marker({
  color: '#3b82f6'
})
  .setLngLat([lon, lat])
  .setPopup(popup)
  .addTo(map);
```

### Fit Bounds
```javascript
const bounds = new mapboxgl.LngLatBounds();
activities.forEach(activity => {
  bounds.extend([activity.location.lon, activity.location.lat]);
});
map.fitBounds(bounds, { padding: 50 });
```

---

## 🐛 Troubleshooting

### Map Not Showing
- ✅ Check Mapbox token is set in `.env`
- ✅ Verify `mapbox-gl` is installed
- ✅ Check browser console for errors
- ✅ Make sure you're on the "Map" tab

### No Activities Showing
- ✅ Verify itinerary was generated (check ResultsPage)
- ✅ Confirm `tripData.generatedItinerary` exists
- ✅ Check that activities have `location` data

### Images Not Loading
- ✅ Activities use Unsplash fallback
- ✅ If image fails, shows placeholder
- ✅ Check network tab for image URLs

### Navigation Not Working
- ✅ Verify route is added in `App.jsx`
- ✅ Check ProtectedRoute condition
- ✅ Ensure itinerary exists in context

---

## 🎨 Customization

### Change Map Style
```javascript
// In ItineraryPage.jsx
style: 'mapbox://styles/mapbox/outdoors-v12'  // or satellite-v9, dark-v11
```

### Adjust Marker Colors
```javascript
// Per time period
const markerColor = 
  slot.period === 'morning' ? '#FCD34D' :  // Yellow
  slot.period === 'afternoon' ? '#FB923C' : // Orange
  '#A78BFA';  // Purple
```

### Add More Tabs
```javascript
// In ItineraryPage.jsx tabs array
<button onClick={() => setActiveTab("budget")}>
  <DollarSign className="w-4 h-4 inline mr-2" />
  Budget
</button>
```

---

## ✨ Future Enhancements

### Potential Features
- [ ] **Booking Integration:** Book hotels/activities directly
- [ ] **Weather Forecast:** Show weather for each day
- [ ] **Collaborative Planning:** Share with friends
- [ ] **PDF Export:** Download itinerary as PDF
- [ ] **Drag & Drop:** Reorder activities
- [ ] **Chat Sidebar:** Refine itinerary with AI
- [ ] **Route Optimization:** Best order for activities
- [ ] **Transportation:** Add transit between activities

### Map Enhancements
- [ ] **Driving Directions:** Show routes between activities
- [ ] **Public Transit:** Overlay transit lines
- [ ] **Custom Markers:** Different icons per category
- [ ] **Clustering:** Group nearby activities
- [ ] **3D Buildings:** Enable 3D terrain

---

## 🎊 Complete!

Your itinerary view is ready! Users can now:
1. Generate AI itinerary from preferences
2. View beautiful timeline with activities
3. See all locations on interactive map
4. Navigate days with ease
5. Get details for each activity

**Test it now:** Complete the onboarding flow and click "View Itinerary"! 🚀
