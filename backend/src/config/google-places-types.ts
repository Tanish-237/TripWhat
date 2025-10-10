/**
 * Google Places API Place Types
 * Reference: https://developers.google.com/maps/documentation/places/web-service/place-types
 */

/**
 * Comprehensive list of Google Places types organized by category
 */
export const GOOGLE_PLACES_TYPES = {
  // Culture & Attractions
  culture: [
    'art_gallery',
    'art_studio',
    'museum',
    'cultural_landmark',
    'historical_place',
    'historical_landmark',
    'monument',
    'sculpture',
    'tourist_attraction',
    'auditorium',
    'performing_arts_theater',
    'opera_house',
    'concert_hall',
    'philharmonic_hall',
  ],

  // Entertainment & Recreation
  entertainment: [
    'amusement_park',
    'amusement_center',
    'aquarium',
    'zoo',
    'water_park',
    'theme_park',
    'casino',
    'movie_theater',
    'night_club',
    'comedy_club',
    'karaoke',
    'video_arcade',
    'bowling_alley',
  ],

  // Nature & Outdoors
  nature: [
    'park',
    'national_park',
    'state_park',
    'botanical_garden',
    'garden',
    'beach',
    'hiking_area',
    'wildlife_park',
    'wildlife_refuge',
    'dog_park',
    'cycling_park',
    'picnic_ground',
    'observation_deck',
    'visitor_center',
  ],

  // Food & Dining
  restaurants: [
    'restaurant',
    'cafe',
    'coffee_shop',
    'bakery',
    'bar',
    'fine_dining_restaurant',
    'fast_food_restaurant',
    'italian_restaurant',
    'chinese_restaurant',
    'japanese_restaurant',
    'indian_restaurant',
    'french_restaurant',
    'mexican_restaurant',
    'thai_restaurant',
    'american_restaurant',
    'seafood_restaurant',
    'sushi_restaurant',
    'pizza_restaurant',
    'steak_house',
    'vegan_restaurant',
    'vegetarian_restaurant',
    'dessert_shop',
    'ice_cream_shop',
  ],

  // Shopping
  shopping: [
    'shopping_mall',
    'store',
    'department_store',
    'clothing_store',
    'gift_shop',
    'book_store',
    'jewelry_store',
    'supermarket',
    'market',
    'convenience_store',
  ],

  // Lodging
  lodging: [
    'hotel',
    'lodging',
    'bed_and_breakfast',
    'hostel',
    'resort_hotel',
    'motel',
    'guest_house',
    'campground',
  ],

  // Religious Sites
  religious: [
    'church',
    'mosque',
    'synagogue',
    'hindu_temple',
    'place_of_worship',
  ],

  // Sports & Fitness
  sports: [
    'gym',
    'fitness_center',
    'sports_complex',
    'stadium',
    'arena',
    'golf_course',
    'swimming_pool',
    'ice_skating_rink',
    'ski_resort',
  ],

  // Nightlife
  nightlife: [
    'night_club',
    'bar',
    'wine_bar',
    'pub',
    'karaoke',
    'dance_hall',
  ],

  // Transportation
  transportation: [
    'airport',
    'train_station',
    'bus_station',
    'subway_station',
    'transit_station',
    'ferry_terminal',
    'parking',
  ],

  // Services
  services: [
    'bank',
    'atm',
    'hospital',
    'pharmacy',
    'post_office',
    'police',
    'library',
    'tourist_information_center',
  ],
} as const;

/**
 * User intent to Google Places types mapping
 * This helps the LLM understand which place types to use for different queries
 */
export const INTENT_TO_PLACE_TYPES: Record<string, string[]> = {
  // Culture & sightseeing
  museums: ['museum', 'art_gallery', 'historical_landmark'],
  art: ['art_gallery', 'art_studio', 'museum', 'sculpture'],
  history: ['historical_place', 'historical_landmark', 'monument', 'museum'],
  monuments: ['monument', 'sculpture', 'historical_landmark'],
  landmarks: ['tourist_attraction', 'cultural_landmark', 'historical_landmark', 'monument'],
  attractions: ['tourist_attraction', 'amusement_park', 'zoo', 'aquarium'],
  sightseeing: ['tourist_attraction', 'observation_deck', 'visitor_center'],

  // Nature
  parks: ['park', 'national_park', 'state_park', 'botanical_garden'],
  nature: ['park', 'national_park', 'hiking_area', 'botanical_garden', 'wildlife_park'],
  beaches: ['beach'],
  gardens: ['botanical_garden', 'garden'],
  hiking: ['hiking_area', 'national_park', 'state_park'],
  outdoors: ['park', 'hiking_area', 'beach', 'picnic_ground'],

  // Entertainment
  entertainment: ['amusement_park', 'movie_theater', 'casino', 'night_club'],
  theme_parks: ['amusement_park', 'water_park'],
  movies: ['movie_theater'],
  nightlife: ['night_club', 'bar', 'wine_bar', 'pub', 'karaoke'],
  clubs: ['night_club', 'dance_hall'],
  bars: ['bar', 'wine_bar', 'pub'],

  // Food
  restaurants: ['restaurant', 'cafe', 'fine_dining_restaurant'],
  food: ['restaurant', 'cafe', 'bakery', 'food_court'],
  dining: ['restaurant', 'fine_dining_restaurant', 'bar_and_grill'],
  cafes: ['cafe', 'coffee_shop'],
  coffee: ['coffee_shop', 'cafe'],
  desserts: ['dessert_shop', 'ice_cream_shop', 'bakery'],

  // Shopping
  shopping: ['shopping_mall', 'market', 'department_store'],
  markets: ['market', 'supermarket'],
  malls: ['shopping_mall', 'department_store'],

  // Lodging
  hotels: ['hotel', 'lodging', 'resort_hotel'],
  accommodation: ['hotel', 'lodging', 'bed_and_breakfast', 'hostel'],

  // Religious
  religious: ['church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship'],
  churches: ['church'],
  temples: ['hindu_temple', 'place_of_worship'],

  // Sports
  sports: ['stadium', 'arena', 'sports_complex', 'gym'],
  fitness: ['gym', 'fitness_center', 'yoga_studio'],
};

/**
 * Get human-readable display name for place type
 */
export function getPlaceTypeDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    art_gallery: 'Art Gallery',
    museum: 'Museum',
    historical_landmark: 'Historical Landmark',
    tourist_attraction: 'Tourist Attraction',
    park: 'Park',
    national_park: 'National Park',
    beach: 'Beach',
    restaurant: 'Restaurant',
    cafe: 'Café',
    hotel: 'Hotel',
    shopping_mall: 'Shopping Mall',
    night_club: 'Night Club',
    bar: 'Bar',
    // Add more as needed
  };

  return displayNames[type] || type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Map user-friendly category names to Google Places types
 */
export function mapUserCategoryToPlaceTypes(category: string): string[] {
  const normalized = category.toLowerCase().trim();
  
  // Direct mapping
  if (INTENT_TO_PLACE_TYPES[normalized]) {
    return INTENT_TO_PLACE_TYPES[normalized];
  }

  // Fuzzy matching - check if category is contained in any key
  for (const [key, types] of Object.entries(INTENT_TO_PLACE_TYPES)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return types;
    }
  }

  // Check if it's a direct place type
  for (const types of Object.values(GOOGLE_PLACES_TYPES)) {
    const typesArray = types as readonly string[];
    if (typesArray.includes(normalized)) {
      return [normalized];
    }
  }

  // Default: tourist attractions
  return ['tourist_attraction', 'park', 'museum'];
}

/**
 * Get recommended place types based on travel intent
 */
export function getRecommendedPlaceTypes(intent: string): string[] {
  const intentMap: Record<string, string[]> = {
    leisure: ['park', 'beach', 'cafe', 'restaurant', 'tourist_attraction'],
    adventure: ['national_park', 'hiking_area', 'adventure_sports_center', 'beach'],
    cultural: ['museum', 'art_gallery', 'historical_landmark', 'performing_arts_theater'],
    family: ['amusement_park', 'zoo', 'aquarium', 'park', 'beach'],
    romantic: ['fine_dining_restaurant', 'wine_bar', 'park', 'observation_deck'],
    business: ['restaurant', 'cafe', 'hotel', 'convention_center'],
    nightlife: ['night_club', 'bar', 'karaoke', 'pub'],
    shopping: ['shopping_mall', 'market', 'department_store'],
    wellness: ['spa', 'yoga_studio', 'fitness_center', 'wellness_center'],
    foodie: ['restaurant', 'cafe', 'bakery', 'market', 'fine_dining_restaurant'],
  };

  return intentMap[intent.toLowerCase()] || ['tourist_attraction', 'restaurant', 'park'];
}

/**
 * System prompt for LLM to detect place types
 */
export const PLACE_TYPE_DETECTION_PROMPT = `
You are an expert at understanding travel queries and mapping them to Google Places API place types.

Given a user's travel query, analyze their intent and return the most relevant Google Places types.

Available place type categories:
- Culture: museum, art_gallery, historical_landmark, monument, tourist_attraction
- Nature: park, national_park, beach, hiking_area, botanical_garden
- Entertainment: amusement_park, movie_theater, casino, night_club, zoo, aquarium
- Food: restaurant, cafe, coffee_shop, bakery, bar, fine_dining_restaurant
- Shopping: shopping_mall, market, department_store, store
- Sports: gym, stadium, sports_complex, golf_course
- Religious: church, mosque, synagogue, hindu_temple, place_of_worship
- Lodging: hotel, resort_hotel, bed_and_breakfast, hostel

Return the response as JSON:
{
  "place_types": ["type1", "type2", "type3"],
  "primary_intent": "sightseeing" | "dining" | "shopping" | "entertainment" | "nature" | "culture",
  "reasoning": "Brief explanation of why these types were chosen"
}

Examples:
- "Find museums in Paris" → {"place_types": ["museum", "art_gallery", "historical_landmark"], "primary_intent": "culture"}
- "Best beaches in Bali" → {"place_types": ["beach", "water_park"], "primary_intent": "nature"}
- "Italian restaurants near me" → {"place_types": ["italian_restaurant", "restaurant"], "primary_intent": "dining"}
- "Things to do in Tokyo" → {"place_types": ["tourist_attraction", "museum", "park", "restaurant"], "primary_intent": "sightseeing"}
`;
