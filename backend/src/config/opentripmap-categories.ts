/**
 * OpenTripMap Categories - Dynamic Category System
 * Official API Reference: https://dev.opentripmap.org/catalog
 * 
 * This uses a lightweight keyword-to-category mapping approach
 * instead of storing the entire catalog (500+ categories)
 */

export interface CategoryMapping {
  keywords: string[];
  primary: string;
  secondary?: string[];
  icon: string;
  description: string;
}

/**
 * Main category groups from OpenTripMap
 * These are the top-level "kinds" parameters
 */
export const MAIN_CATEGORIES = {
  NATURAL: 'natural',
  CULTURAL: 'cultural',
  HISTORIC: 'historic',
  RELIGION: 'religion',
  ARCHITECTURE: 'architecture',
  MUSEUMS: 'museums',
  THEATRES: 'theatres_and_entertainments',
  URBAN: 'urban_environment',
  AMUSEMENTS: 'amusements',
  SPORT: 'sport',
  ADULT: 'adult',
  TRANSPORT: 'transport',
  SHOPS: 'shops',
  FOODS: 'foods',
  BANKS: 'banks',
  ACCOMODATIONS: 'accomodations',
  TOURIST_FACILITIES: 'tourist_facilities',
  OTHER: 'other',
  INTERESTING_PLACES: 'interesting_places',
} as const;

/**
 * Smart keyword-to-category mapping
 * Maps user-friendly terms to OpenTripMap API category codes
 */
export const CATEGORY_MAPPINGS: Record<string, CategoryMapping> = {
  // NATURAL ATTRACTIONS
  nature: {
    keywords: ['nature', 'natural', 'outdoor', 'wilderness'],
    primary: 'natural',
    secondary: ['nature_reserves', 'geological_formations'],
    icon: '🌲',
    description: 'Natural attractions and outdoor spaces',
  },
  beach: {
    keywords: ['beach', 'beaches', 'coast', 'seaside', 'shore'],
    primary: 'beaches',
    secondary: ['golden_sand_beaches', 'white_sand_beaches'],
    icon: '🏖️',
    description: 'Beaches and coastal areas',
  },
  mountain: {
    keywords: ['mountain', 'mountains', 'peak', 'peaks', 'hiking', 'trek'],
    primary: 'mountain_peaks',
    secondary: ['geological_formations'],
    icon: '⛰️',
    description: 'Mountains and hiking destinations',
  },
  waterfall: {
    keywords: ['waterfall', 'waterfalls', 'cascade'],
    primary: 'waterfalls',
    secondary: ['water'],
    icon: '💧',
    description: 'Waterfalls and water features',
  },
  park: {
    keywords: ['park', 'parks', 'garden', 'gardens'],
    primary: 'gardens_and_parks',
    secondary: ['nature_reserves', 'national_parks'],
    icon: '🌳',
    description: 'Parks and gardens',
  },
  island: {
    keywords: ['island', 'islands'],
    primary: 'islands',
    icon: '🏝️',
    description: 'Islands and archipelagos',
  },
  cave: {
    keywords: ['cave', 'caves', 'cavern'],
    primary: 'caves',
    secondary: ['geological_formations'],
    icon: '🕳️',
    description: 'Caves and underground formations',
  },
  volcano: {
    keywords: ['volcano', 'volcanoes', 'volcanic'],
    primary: 'volcanoes',
    secondary: ['geological_formations'],
    icon: '🌋',
    description: 'Volcanoes and volcanic features',
  },

  // CULTURAL & MUSEUMS
  museum: {
    keywords: ['museum', 'museums', 'exhibit', 'exhibition'],
    primary: 'museums',
    secondary: ['art_galleries', 'history_museums'],
    icon: '🏛️',
    description: 'Museums and exhibitions',
  },
  art: {
    keywords: ['art', 'gallery', 'galleries', 'painting', 'sculpture'],
    primary: 'art_galleries',
    secondary: ['museums', 'sculptures'],
    icon: '🎨',
    description: 'Art galleries and museums',
  },
  cultural: {
    keywords: ['cultural', 'culture', 'heritage'],
    primary: 'cultural',
    secondary: ['museums', 'historic'],
    icon: '🎭',
    description: 'Cultural sites and heritage',
  },
  theater: {
    keywords: ['theater', 'theatre', 'opera', 'performance', 'show'],
    primary: 'theatres_and_entertainments',
    secondary: ['opera_houses', 'concert_halls'],
    icon: '🎭',
    description: 'Theaters and performance venues',
  },
  cinema: {
    keywords: ['cinema', 'movie', 'film'],
    primary: 'cinemas',
    secondary: ['theatres_and_entertainments'],
    icon: '🎬',
    description: 'Movie theaters and cinemas',
  },

  // HISTORIC SITES
  historic: {
    keywords: ['historic', 'historical', 'history', 'heritage', 'ancient'],
    primary: 'historic',
    secondary: ['monuments', 'historic_architecture'],
    icon: '🏛️',
    description: 'Historical sites and monuments',
  },
  monument: {
    keywords: ['monument', 'monuments', 'memorial', 'memorials', 'statue'],
    primary: 'monuments_and_memorials',
    secondary: ['monuments', 'sculptures'],
    icon: '🗿',
    description: 'Monuments and memorials',
  },
  castle: {
    keywords: ['castle', 'castles', 'fort', 'fortress', 'fortification'],
    primary: 'castles',
    secondary: ['fortifications'],
    icon: '🏰',
    description: 'Castles and fortifications',
  },
  palace: {
    keywords: ['palace', 'palaces', 'manor'],
    primary: 'palaces',
    secondary: ['historic_architecture'],
    icon: '🏰',
    description: 'Palaces and manor houses',
  },
  ruins: {
    keywords: ['ruins', 'ancient', 'archaeological', 'archaeology'],
    primary: 'archaeology',
    secondary: ['archaeological_sites', 'settlements'],
    icon: '⚱️',
    description: 'Archaeological sites and ruins',
  },

  // RELIGIOUS SITES
  church: {
    keywords: ['church', 'churches', 'cathedral', 'chapel', 'basilica'],
    primary: 'churches',
    secondary: ['cathedrals', 'catholic_churches'],
    icon: '⛪',
    description: 'Churches and cathedrals',
  },
  temple: {
    keywords: ['temple', 'temples', 'shrine'],
    primary: 'buddhist_temples',
    secondary: ['hindu_temples', 'other_temples'],
    icon: '🛕',
    description: 'Temples and shrines',
  },
  mosque: {
    keywords: ['mosque', 'mosques'],
    primary: 'mosques',
    icon: '🕌',
    description: 'Mosques',
  },
  synagogue: {
    keywords: ['synagogue', 'synagogues'],
    primary: 'synagogues',
    icon: '🕍',
    description: 'Synagogues',
  },
  religious: {
    keywords: ['religious', 'religion', 'worship', 'sacred', 'holy'],
    primary: 'religion',
    secondary: ['churches', 'temples', 'mosques'],
    icon: '⛪',
    description: 'Religious sites',
  },

  // ARCHITECTURE
  architecture: {
    keywords: ['architecture', 'building', 'buildings', 'architectural'],
    primary: 'architecture',
    secondary: ['historic_architecture', 'skyscrapers'],
    icon: '🏛️',
    description: 'Architectural landmarks',
  },
  skyscraper: {
    keywords: ['skyscraper', 'skyscrapers', 'tall building', 'tower'],
    primary: 'skyscrapers',
    secondary: ['towers', 'observation_towers'],
    icon: '🏙️',
    description: 'Skyscrapers and tall buildings',
  },
  bridge: {
    keywords: ['bridge', 'bridges'],
    primary: 'bridges',
    icon: '🌉',
    description: 'Bridges',
  },
  tower: {
    keywords: ['tower', 'towers', 'observation'],
    primary: 'observation_towers',
    secondary: ['towers', 'bell_towers'],
    icon: '🗼',
    description: 'Towers and observation points',
  },

  // FOOD & DINING
  restaurant: {
    keywords: ['restaurant', 'restaurants', 'dining', 'dine', 'eat'],
    primary: 'restaurants',
    secondary: ['foods'],
    icon: '🍽️',
    description: 'Restaurants and dining',
  },
  cafe: {
    keywords: ['cafe', 'cafes', 'coffee', 'coffeeshop'],
    primary: 'cafes',
    icon: '☕',
    description: 'Cafes and coffee shops',
  },
  food: {
    keywords: ['food', 'foods', 'cuisine', 'culinary'],
    primary: 'foods',
    secondary: ['restaurants', 'markets'],
    icon: '🍴',
    description: 'Food and dining options',
  },
  bar: {
    keywords: ['bar', 'bars', 'cocktail', 'drinks'],
    primary: 'bars',
    icon: '🍸',
    description: 'Bars and cocktail lounges',
  },
  pub: {
    keywords: ['pub', 'pubs', 'beer'],
    primary: 'pubs',
    icon: '🍺',
    description: 'Pubs and beer gardens',
  },
  market: {
    keywords: ['market', 'markets', 'marketplace', 'bazaar'],
    primary: 'marketplaces',
    secondary: ['shops'],
    icon: '🛒',
    description: 'Markets and bazaars',
  },

  // SHOPPING
  shopping: {
    keywords: ['shopping', 'shop', 'shops', 'store', 'stores'],
    primary: 'shops',
    secondary: ['malls', 'marketplaces'],
    icon: '🛍️',
    description: 'Shopping areas',
  },
  mall: {
    keywords: ['mall', 'malls', 'shopping center'],
    primary: 'malls',
    icon: '🏬',
    description: 'Shopping malls',
  },

  // ACCOMMODATION
  hotel: {
    keywords: ['hotel', 'hotels', 'accommodation', 'stay', 'lodging'],
    primary: 'accomodations',
    secondary: ['other_hotels', 'resorts'],
    icon: '🏨',
    description: 'Hotels and accommodations',
  },
  hostel: {
    keywords: ['hostel', 'hostels', 'backpacker'],
    primary: 'hostels',
    icon: '🏠',
    description: 'Hostels',
  },

  // ENTERTAINMENT & AMUSEMENTS
  amusement: {
    keywords: ['amusement', 'theme park', 'fun', 'entertainment'],
    primary: 'amusements',
    secondary: ['amusement_parks', 'theme_parks'],
    icon: '🎡',
    description: 'Amusement parks and entertainment',
  },
  zoo: {
    keywords: ['zoo', 'zoos', 'wildlife', 'safari'],
    primary: 'zoos',
    icon: '🦁',
    description: 'Zoos and wildlife parks',
  },
  aquarium: {
    keywords: ['aquarium', 'aquariums', 'marine', 'ocean'],
    primary: 'aquariums',
    icon: '🐠',
    description: 'Aquariums',
  },
  waterpark: {
    keywords: ['waterpark', 'water park', 'splash'],
    primary: 'water_parks',
    icon: '🌊',
    description: 'Water parks',
  },

  // SPORT & RECREATION
  sport: {
    keywords: ['sport', 'sports', 'athletic', 'recreation'],
    primary: 'sport',
    secondary: ['stadiums'],
    icon: '⚽',
    description: 'Sports and recreation',
  },
  stadium: {
    keywords: ['stadium', 'stadiums', 'arena'],
    primary: 'stadiums',
    icon: '🏟️',
    description: 'Stadiums and arenas',
  },
  skiing: {
    keywords: ['ski', 'skiing', 'winter sport', 'slope'],
    primary: 'skiing',
    secondary: ['winter_sports'],
    icon: '⛷️',
    description: 'Skiing and winter sports',
  },
  diving: {
    keywords: ['dive', 'diving', 'scuba', 'snorkel'],
    primary: 'diving',
    secondary: ['dive_spots'],
    icon: '🤿',
    description: 'Diving spots',
  },

  // URBAN & VIEWPOINTS
  viewpoint: {
    keywords: ['viewpoint', 'view', 'panorama', 'overlook', 'scenic'],
    primary: 'view_points',
    secondary: ['observation_towers'],
    icon: '👁️',
    description: 'Viewpoints and scenic spots',
  },
  square: {
    keywords: ['square', 'squares', 'plaza', 'piazza'],
    primary: 'squares',
    secondary: ['urban_environment'],
    icon: '🏛️',
    description: 'Public squares and plazas',
  },
  fountain: {
    keywords: ['fountain', 'fountains'],
    primary: 'fountains',
    icon: '⛲',
    description: 'Fountains',
  },
};

/**
 * Travel type to preferred categories mapping
 */
export const TRAVEL_TYPE_CATEGORIES: Record<string, string[]> = {
  adventure: ['natural', 'geological_formations', 'mountain_peaks', 'beaches', 'sport', 'diving'],
  cultural: ['cultural', 'museums', 'historic', 'monuments_and_memorials', 'theatres_and_entertainments'],
  family: ['amusements', 'zoos', 'aquariums', 'beaches', 'gardens_and_parks'],
  foodie: ['foods', 'restaurants', 'marketplaces', 'cafes'],
  relaxation: ['beaches', 'gardens_and_parks', 'natural', 'cafes'],
  solo: ['museums', 'art_galleries', 'cafes', 'view_points', 'shops'],
  romantic: ['view_points', 'restaurants', 'gardens_and_parks', 'beaches'],
  business: ['restaurants', 'cafes', 'shops', 'accomodations'],
};

/**
 * Get OpenTripMap category codes from user query
 */
export function getCategoriesFromQuery(query: string, travelType?: string): string[] {
  const queryLower = query.toLowerCase();
  const categories = new Set<string>();

  // Match keywords to categories
  for (const [_, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
    const hasMatch = mapping.keywords.some(keyword => queryLower.includes(keyword));
    if (hasMatch) {
      categories.add(mapping.primary);
      // Add secondary categories if they're relevant
      if (mapping.secondary) {
        mapping.secondary.forEach(cat => categories.add(cat));
      }
    }
  }

  // If no specific categories found, use travel type preferences
  if (categories.size === 0 && travelType && TRAVEL_TYPE_CATEGORIES[travelType]) {
    TRAVEL_TYPE_CATEGORIES[travelType].forEach(cat => categories.add(cat));
  }

  // Default fallback
  if (categories.size === 0) {
    return ['interesting_places', 'cultural', 'historic'];
  }

  // Limit to top 5 most relevant to avoid API overload
  return Array.from(categories).slice(0, 5);
}

/**
 * Get icon for category
 */
export function getCategoryIcon(categoryCode: string): string {
  const mapping = Object.values(CATEGORY_MAPPINGS).find(
    m => m.primary === categoryCode || m.secondary?.includes(categoryCode)
  );
  return mapping?.icon || '📍';
}

/**
 * Get display name for category (converts code to readable name)
 */
export function getCategoryDisplayName(categoryCode: string): string {
  // Convert snake_case to Title Case
  return categoryCode
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate and clean category codes for API calls
 */
export function validateCategories(categories: string[]): string[] {
  // Remove duplicates and empty strings
  return [...new Set(categories.filter(c => c && c.length > 0))];
}

/**
 * Combine multiple categories for API "kinds" parameter
 * OpenTripMap accepts comma-separated kinds: "museums,galleries,historic"
 */
export function formatCategoriesForAPI(categories: string[]): string {
  return validateCategories(categories).join(',');
}
