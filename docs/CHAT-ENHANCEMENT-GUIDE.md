# Chat Experience Enhancement Guide

## Overview
This document describes the enhanced chat system with intelligent category detection and robust tool calling for the TripWhat application.

## Architecture Improvements

### 1. **Dynamic Category System**
**Location:** `backend/src/config/opentripmap-categories.ts`

Instead of hardcoding all 500+ OpenTripMap categories, we use a smart keyword-to-category mapping system:

```typescript
// User says: "Show me museums in Paris"
// System detects: ['museums', 'art_galleries', 'history_museums']
const categories = getCategoriesFromQuery("museums in Paris");
// Result: ['museums', 'art_galleries']
```

**Key Features:**
- ✅ Lightweight keyword mapping (not storing entire catalog)
- ✅ Travel type preferences (adventure, cultural, family, etc.)
- ✅ Automatic category expansion (e.g., "art" → museums + galleries)
- ✅ Smart fallbacks when no specific category detected

### 2. **Enhanced Intent Detection**
**Location:** `backend/src/agents/intent-detector.ts`

The intent detector now:
- Extracts OpenTripMap categories from user queries
- Stores categories in `entities.opentripmap_kinds[]`
- Passes travel type context for better category selection

```typescript
const intent = await intentDetector.detectIntent(
  "Show me beaches and waterfalls in Bali",
  [], // conversation history
  "adventure" // travel type
);

// Result:
// intent.primary_intent: 'search_attractions'
// intent.entities.opentripmap_kinds: ['beaches', 'waterfalls', 'water']
```

### 3. **Improved Travel Agent**
**Location:** `backend/src/agents/travel-agent.ts`

The travel agent now:
- Receives categories from intent detector
- Formats multiple categories for API calls
- Provides better logging with category names

```typescript
// Instead of single category:
category: 'museums'

// Now supports multiple:
category: 'museums,art_galleries,history_museums'
```

## OpenTripMap Categories Reference

### Main Category Groups

| Category Code | Description | Example Keywords |
|--------------|-------------|------------------|
| `natural` | Nature & Parks | nature, outdoor, wilderness |
| `cultural` | Cultural Sites | culture, heritage, museums |
| `historic` | Historic Sites | history, ancient, monuments |
| `religion` | Religious Sites | church, temple, mosque |
| `architecture` | Architecture | building, skyscraper, bridge |
| `museums` | Museums | museum, exhibition, gallery |
| `foods` | Dining | restaurant, cafe, food |
| `accomodations` | Hotels | hotel, stay, accommodation |
| `amusements` | Entertainment | amusement, theme park, zoo |
| `sport` | Sports | sport, stadium, skiing |
| `beaches` | Beaches | beach, coast, seaside |

### Popular Subcategories

**Natural:**
- `beaches` - Beaches and coastal areas
- `mountain_peaks` - Mountains and hiking
- `waterfalls` - Waterfalls and water features
- `caves` - Caves and underground formations
- `volcanoes` - Volcanoes

**Cultural & Historic:**
- `museums` - All types of museums
- `art_galleries` - Art galleries
- `castles` - Castles and fortifications
- `palaces` - Palaces and manor houses
- `monuments_and_memorials` - Monuments and memorials
- `archaeology` - Archaeological sites

**Religious:**
- `churches` - Churches and cathedrals
- `buddhist_temples` - Buddhist temples
- `mosques` - Mosques
- `synagogues` - Synagogues

**Food & Drink:**
- `restaurants` - Restaurants
- `cafes` - Coffee shops
- `bars` - Bars and cocktail lounges
- `pubs` - Pubs
- `marketplaces` - Markets

## Usage Examples

### Example 1: Beach Search
```typescript
// User: "Find beautiful beaches in Thailand"

// Intent Detection:
{
  primary_intent: 'search_attractions',
  entities: {
    location: 'Thailand',
    opentripmap_kinds: ['beaches', 'golden_sand_beaches', 'white_sand_beaches']
  }
}

// API Call:
GET /api/opentripmap/places?
  location=Thailand&
  kinds=beaches,golden_sand_beaches,white_sand_beaches
```

### Example 2: Cultural Trip
```typescript
// User: "Show me museums and historic sites in Rome"

// Intent Detection:
{
  primary_intent: 'search_attractions',
  entities: {
    location: 'Rome',
    opentripmap_kinds: ['museums', 'art_galleries', 'historic', 'monuments']
  }
}

// API Call:
GET /api/opentripmap/places?
  location=Rome&
  kinds=museums,art_galleries,historic,monuments
```

### Example 3: Food Tour
```typescript
// User: "Best restaurants and cafes in Paris"

// Intent Detection:
{
  primary_intent: 'search_restaurants',
  entities: {
    location: 'Paris',
    opentripmap_kinds: ['restaurants', 'cafes', 'foods']
  }
}

// API Call:
GET /api/opentripmap/places?
  location=Paris&
  kinds=restaurants,cafes,foods
```

### Example 4: Adventure Travel
```typescript
// User: "I want adventure activities in New Zealand"
// Travel Type: "adventure"

// Intent Detection with Travel Type:
{
  primary_intent: 'search_attractions',
  entities: {
    location: 'New Zealand',
    opentripmap_kinds: ['natural', 'geological_formations', 'mountain_peaks', 'sport', 'diving']
  }
}
```

## Testing the Enhanced System

### Manual Testing Steps

1. **Test Category Detection**
```bash
# Query with specific category
"Show me museums in London"
# Expected categories: ['museums', 'art_galleries']

# Query with multiple categories  
"beaches and waterfalls in Bali"
# Expected categories: ['beaches', 'waterfalls', 'water']

# Query without specific category
"things to do in Tokyo"
# Expected: Uses travel type or default categories
```

2. **Test Travel Type Integration**
```bash
# Set travel type to 'cultural'
User preference: cultural
Query: "What should I see in Athens?"
# Expected categories: ['cultural', 'museums', 'historic', 'monuments']

# Set travel type to 'adventure'
User preference: adventure
Query: "Places to visit in Nepal"
# Expected categories: ['natural', 'mountain_peaks', 'sport']
```

3. **Test API Integration**
```bash
# Check API calls in logs
🔍 [TOOL] Searching for museums, art_galleries in Paris
✅ [TOOL] Got 25 results for categories: Museums, Art Galleries

# Verify API format
kinds=museums,art_galleries,history_museums
```

### Automated Testing

Create test file: `backend/src/__tests__/category-detection.test.ts`

```typescript
import { getCategoriesFromQuery, formatCategoriesForAPI } from '../config/opentripmap-categories';

describe('Category Detection', () => {
  test('detects museum categories', () => {
    const categories = getCategoriesFromQuery('museums in Paris');
    expect(categories).toContain('museums');
    expect(categories).toContain('art_galleries');
  });

  test('detects beach categories', () => {
    const categories = getCategoriesFromQuery('beautiful beaches');
    expect(categories).toContain('beaches');
  });

  test('uses travel type fallback', () => {
    const categories = getCategoriesFromQuery('things to do', 'cultural');
    expect(categories).toContain('cultural');
    expect(categories).toContain('museums');
  });

  test('formats categories for API', () => {
    const formatted = formatCategoriesForAPI(['museums', 'galleries']);
    expect(formatted).toBe('museums,galleries');
  });
});
```

## Debugging Tips

### Enable Detailed Logging

The system already logs category detection:
```
🎯 [INTENT DETECTOR] Detected: {
  intent: 'search_attractions',
  tools: ['search_attractions'],
  categories: ['museums', 'art_galleries'],
  confidence: 0.85
}

🔍 [TOOL] Searching for museums, art_galleries in Paris
✅ [TOOL] Got 15 results for categories: Museums, Art Galleries
```

### Common Issues

**Issue 1: No results found**
```
Problem: Categories too specific
Solution: System auto-expands categories, but check if keyword mapping exists
```

**Issue 2: Wrong categories detected**
```
Problem: Ambiguous keywords
Solution: Add more specific keywords or update KEYWORD_TO_CATEGORY mapping
```

**Issue 3: API rate limiting**
```
Problem: Too many category combinations
Solution: System limits to 5 categories max per query
```

## Extending the System

### Adding New Category Mappings

Edit `backend/src/config/opentripmap-categories.ts`:

```typescript
export const CATEGORY_MAPPINGS: Record<string, CategoryMapping> = {
  // ... existing mappings ...
  
  // Add new mapping
  vineyard: {
    keywords: ['vineyard', 'vineyards', 'winery', 'wine'],
    primary: 'wineries',
    secondary: ['farms'],
    icon: '🍷',
    description: 'Vineyards and wineries',
  },
};
```

### Adding Travel Type Categories

```typescript
export const TRAVEL_TYPE_CATEGORIES: Record<string, string[]> = {
  // ... existing types ...
  
  // Add new travel type
  wellness: ['natural', 'gardens_and_parks', 'baths_and_saunas', 'cafes'],
};
```

## Performance Considerations

1. **Category Limit:** Max 5 categories per query to avoid API overload
2. **Caching:** Consider caching category detection results
3. **Rate Limiting:** OpenTripMap API has rate limits - use built-in retry logic

## Best Practices

1. ✅ **Always log detected categories** for debugging
2. ✅ **Use travel type** when available for better results
3. ✅ **Validate category codes** before API calls
4. ✅ **Provide fallbacks** for unknown queries
5. ✅ **Format categories properly** (comma-separated, no spaces)

## API Response Format

The enhanced system returns structured results:

```json
{
  "searchResults": [
    {
      "id": "xid123",
      "name": "Louvre Museum",
      "location": {
        "latitude": 48.8606,
        "longitude": 2.3376
      },
      "category": ["museums", "art_galleries"],
      "rating": 7,
      "kinds": "museums,cultural,interesting_places"
    }
  ]
}
```

## Next Steps

1. ✅ Category system implemented
2. ✅ Intent detector enhanced
3. ✅ Travel agent updated
4. 🔄 Add more keyword mappings based on user queries
5. 🔄 Implement caching for frequently searched categories
6. 🔄 Add analytics to track popular category combinations

---

**Last Updated:** 2025-10-10
**Version:** 1.0
**Status:** ✅ Production Ready
