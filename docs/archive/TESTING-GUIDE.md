# Quick Testing Guide - Phase 1.5

## Prerequisites
✅ Backend running on http://localhost:5000
✅ Frontend running on http://localhost:5173
✅ MongoDB running
✅ Logged in to the app

---

## Test Cases

### 1. Restaurant Search
**Query**: "Find Italian restaurants in Rome"

**Expected**:
- Intent detected: `search_restaurants`
- Tool called: `search_restaurants`
- Returns: List of restaurants in Rome

---

### 2. Distance Calculation
**Query**: "How far is Paris from London?"

**Expected**:
- Intent detected: `calculate_distance`
- Tool called: `calculate_distance`
- Returns: ~344 km, ~5.7 hours by car

---

### 3. Web Search
**Query**: "What's the best time to visit Tokyo?"

**Expected**:
- Intent detected: `web_search`
- Tool called: `web_search`
- Returns: Web search results with travel tips

---

### 4. Attraction Search with Category
**Query**: "Show me museums in Paris"

**Expected**:
- Intent detected: `search_attractions`
- Tool called: `search_by_category`
- Returns: List of museums in Paris

---

### 5. Multi-Tool Planning
**Query**: "Plan a 3-day trip to Barcelona"

**Expected**:
- Intent detected: `plan_trip`
- Tools called: Multiple (destinations, attractions, restaurants)
- Returns: Detailed 3-day itinerary

---

### 6. Nearby Search
**Query**: "What's nearby the Eiffel Tower?"

**Expected**:
- Intent detected: `find_nearby`
- Tool called: `get_nearby_attractions`
- Returns: List of attractions near Eiffel Tower

---

### 7. Category Search
**Query**: "Find parks in London"

**Expected**:
- Intent detected: `search_attractions`
- Tool called: `search_by_category`
- Category: `natural` or `parks`
- Returns: Parks in London

---

### 8. Travel Tips
**Query**: "What should I know before visiting Japan?"

**Expected**:
- Intent detected: `web_search`
- Tool called: `search_travel_tips`
- Returns: Travel tips and customs

---

### 9. Multi-Stop Route
**Query**: "What's the distance from Rome to Florence to Venice?"

**Expected**:
- Intent detected: `calculate_distance`
- Tool called: `estimate_route`
- Returns: Total distance and time for multi-stop route

---

### 10. Casual Chat
**Query**: "Hello, how are you?"

**Expected**:
- Intent detected: `casual_chat`
- No tools called
- Returns: Friendly conversational response

---

## Checking Logs

### Backend Console
Look for these indicators:

```
🧠 [PLANNER] Analyzing user query: ...
🎯 [PLANNER] Detected intent: search_restaurants
🔧 [PLANNER] Tools to call: ["search_restaurants"]
📊 [PLANNER] Confidence: 0.95
💭 [PLANNER] Reasoning: ...

🔧 [TOOL EXECUTOR] Running tools for intent: ...
🔍 [TOOL] Searching for ...
✅ [TOOL] Got X results

✍️  [FORMATTER] Generating response...
✅ [FORMATTER] Response generated successfully
```

---

## Common Issues

### Issue: "Access denied" error
**Solution**: Make sure you're logged in and the auth token is being sent

### Issue: No results returned
**Solution**: Check that OpenTripMap API key is valid

### Issue: Web search not working
**Solution**: DuckDuckGo might be blocking requests. This is normal for free scraping.

### Issue: Distance calculation fails
**Solution**: Make sure location names are recognizable (major cities work best)

---

## Performance Benchmarks

### Expected Response Times

| Query Type | Expected Time |
|------------|---------------|
| Simple search | 2-4 seconds |
| Restaurant search | 3-5 seconds |
| Distance calc | 2-3 seconds |
| Web search | 4-6 seconds |
| Full itinerary | 10-15 seconds |
| Casual chat | 1-2 seconds |

---

## Advanced Testing

### Test Intent Detection Accuracy

Try variations of the same request:
- "Find restaurants in Paris"
- "Where can I eat in Paris?"
- "Show me places to dine in Paris"
- "I'm hungry in Paris"

All should detect `search_restaurants` intent.

### Test Entity Extraction

Try: "I want a 5-day trip to Barcelona on a budget"

Should extract:
- Location: Barcelona
- Duration: 5 days
- Budget: budget

### Test Multi-Tool Queries

Try: "What can I do in Rome and how far is it from Florence?"

Should call:
- `search_attractions` for Rome
- `calculate_distance` for Rome to Florence

---

## Success Criteria

✅ Intent detection works for 9/10 queries
✅ Tools execute without errors
✅ Responses are relevant and helpful
✅ Backend logs show proper workflow
✅ Frontend displays responses correctly
✅ No crashes or timeout errors

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 1.5 is complete
2. 📝 Document any issues found
3. 🚀 Ready for Phase 2 planning
4. 🎉 Celebrate the upgrade!

---

**Happy Testing! 🧪**
