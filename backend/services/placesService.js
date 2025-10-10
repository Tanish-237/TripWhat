import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// OpenTripMap API configuration
const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';
const API_KEY = process.env.OPENTRIPMAP_API_KEY;

// GeoDB Cities API configuration
const GEODB_BASE_URL = 'https://wft-geo-db.p.rapidapi.com/v1/geo';
const GEODB_API_KEY = process.env.GEODB_API_KEY;
const GEODB_HOST = process.env.GEODB_HOST;

if (!API_KEY) {
  console.warn('⚠️  OpenTripMap API key not found. Get your free key at https://opentripmap.io/product');
  console.warn('   Add it to .env as OPENTRIPMAP_API_KEY=your_key_here');
}

if (!GEODB_API_KEY) {
  console.warn('⚠️  GeoDB Cities API key not found. Get your free key at https://rapidapi.com/wirefreethought/api/geodb-cities');
  console.warn('   Add it to .env as GEODB_API_KEY=your_rapidapi_key_here');
}

export async function searchPlaces(query, limit = 10) {
  try {
    if (!API_KEY) {
      console.error('OpenTripMap API key is missing');
      return [];
    }

    console.log(`[OpenTripMap] Searching for: "${query}"`);
    
    // Try different query variations for better results
    const queryVariations = [
      query,
      `${query}, India`, // Add country for common places
      `${query} city`,
      query.replace(/\s+/g, '') // Remove spaces
    ];
    
    let geoResponse = null;
    let locationName = '';
    let country = '';
    let lat = 0;
    let lon = 0;
    
    // Try each variation until we get results
    for (const queryVariation of queryVariations) {
      try {
        console.log(`[OpenTripMap] Trying: "${queryVariation}"`);
        geoResponse = await axios.get(`${BASE_URL}/geoname`, {
          params: {
            name: queryVariation,
            apikey: API_KEY,
          },
          timeout: 5000,
        });

        if (geoResponse.data && geoResponse.data.lat) {
          ({ lat, lon, name: locationName, country } = geoResponse.data);
          console.log(`[OpenTripMap] Found location: ${locationName}, ${country} (${lat}, ${lon})`);
          break;
        }
      } catch (error) {
        console.warn(`[OpenTripMap] Geocoding failed for "${queryVariation}":`, error.message);
        continue;
      }
    }

    if (!lat || !lon) {
      console.log(`[OpenTripMap] No geocoding results for any variation of: "${query}"`);
      return [];
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get places around those coordinates
    const placesResponse = await axios.get(`${BASE_URL}/radius`, {
      params: {
        radius: 10000, // 10km radius
        lon,
        lat,
        limit: Math.min(limit, 20), // API limit
        format: 'geojson',
        rate: 3, // Get places with rating 3 and above
        apikey: API_KEY,
      },
      timeout: 10000,
    });

    const geoData = placesResponse.data;
    
    if (!geoData.features || !Array.isArray(geoData.features)) {
      console.log(`[OpenTripMap] No places found near: ${locationName}`);
      return [];
    }

    console.log(`[OpenTripMap] Found ${geoData.features.length} places near ${locationName}`);

    // Transform GeoJSON features to our format
    const places = await Promise.all(
      geoData.features.slice(0, limit).map(async (feature, index) => {
        const properties = feature.properties;
        const coordinates = feature.geometry.coordinates;
        
        // Add delay between requests to avoid rate limiting
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let details = null;
        try {
          // Get detailed information for the place
          if (properties.xid) {
            const detailResponse = await axios.get(`${BASE_URL}/xid/${properties.xid}`, {
              params: { apikey: API_KEY },
              timeout: 5000,
            });
            details = detailResponse.data;
          }
        } catch (error) {
          console.warn(`[OpenTripMap] Failed to get details for ${properties.name}:`, error.message);
        }

        // Determine place type from kinds
        const kinds = properties.kinds || '';
        let type = 'attraction';
        if (kinds.includes('museums')) type = 'museum';
        else if (kinds.includes('historic')) type = 'historic';
        else if (kinds.includes('natural')) type = 'natural';
        else if (kinds.includes('cultural')) type = 'cultural';
        else if (kinds.includes('religion')) type = 'historic';
        else if (kinds.includes('architecture')) type = 'historic';

        // Generate image URL
        const imageUrl = details?.preview?.source || 
          details?.image || 
          `https://source.unsplash.com/800x600/?${encodeURIComponent(properties.name + ' ' + locationName)}`;

        return {
          id: properties.xid || `otm_${Math.random().toString(36).substr(2, 9)}`,
          name: properties.name || 'Unknown Place',
          location: locationName,
          country: country || '',
          state: geoResponse.data.state || '',
          description: details?.wikipedia_extracts?.text?.slice(0, 200) || 
                      details?.info?.descr || 
                      kinds.split(',').join(', ') || 
                      'Tourist attraction',
          type: type,
          coordinates: {
            lat: coordinates[1],
            lon: coordinates[0]
          },
          imageUrl: imageUrl,
          searchTerms: [
            properties.name?.toLowerCase(),
            locationName?.toLowerCase(),
            country?.toLowerCase(),
            ...kinds.split(',').filter(k => k.trim())
          ].filter(Boolean),
          rating: properties.rate || 0,
          kinds: kinds
        };
      })
    );

    // Filter out places without names and sort by rating
    const validPlaces = places
      .filter(place => place.name && place.name !== 'Unknown Place')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    console.log(`[OpenTripMap] Returning ${validPlaces.length} valid places`);
    return validPlaces;

  } catch (error) {
    console.error(`[OpenTripMap] Search error for "${query}":`, error.message);
    
    // Return empty array on error instead of throwing
    return [];
  }
}

// Autocomplete function using GeoDB Cities API for location suggestions
export async function getLocationAutocomplete(query, limit = 8) {
  try {
    if (!GEODB_API_KEY) {
      console.error('GeoDB Cities API key is missing for autocomplete');
      return [];
    }

    if (!query || query.length < 2) {
      return [];
    }

    console.log(`[GeoDB Cities Autocomplete] Searching for: "${query}"`);

    // Use GeoDB Cities API for proper autocomplete with multiple suggestions
    const response = await axios.get(`${GEODB_BASE_URL}/cities`, {
      params: {
        namePrefix: query,
        limit: limit,
        minPopulation: 1000, // Filter out very small places
        sort: '-population', // Sort by population descending
        languageCode: 'en'
      },
      headers: {
        'X-RapidAPI-Key': GEODB_API_KEY,
        'X-RapidAPI-Host': GEODB_HOST
      },
      timeout: 5000,
    });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      console.log(`[GeoDB Cities Autocomplete] No suggestions for: "${query}"`);
      return [];
    }

    console.log(`[GeoDB Cities Autocomplete] Found ${response.data.data.length} suggestions for: "${query}"`);

    // Transform GeoDB results to our autocomplete format
    const suggestions = response.data.data.map(city => {
      // Determine city type based on population
      let type = 'city';
      if (city.population > 1000000) type = 'major_city';
      else if (city.population > 100000) type = 'city';
      else if (city.population > 10000) type = 'town';
      else type = 'place';

      // Build location description
      let locationParts = [];
      if (city.region) locationParts.push(city.region);
      if (city.country) locationParts.push(city.country);
      const locationDesc = locationParts.join(', ');

      return {
        id: `geodb_${city.id}`,
        name: city.name,
        location: locationDesc,
        country: city.country || '',
        state: city.region || '',
        description: `${getTypeLabel(type)}${locationDesc ? ` in ${locationDesc}` : ''}${city.population ? ` (pop. ${city.population.toLocaleString()})` : ''}`,
        type: type,
        coordinates: {
          lat: city.latitude,
          lon: city.longitude
        },
        searchTerms: [
          city.name?.toLowerCase(),
          city.country?.toLowerCase(),
          city.region?.toLowerCase()
        ].filter(Boolean),
        population: city.population
      };
    });

    console.log(`[GeoDB Cities Autocomplete] Returning ${suggestions.length} suggestions for "${query}"`);
    return suggestions;

  } catch (error) {
    console.error(`[GeoDB Cities Autocomplete] Error for "${query}":`, error.message);
    return [];
  }
}

function getTypeLabel(type) {
  switch (type?.toLowerCase()) {
    case 'country': return 'Country';
    case 'state': return 'State';
    case 'major_city': return 'Major City';
    case 'city': return 'City';
    case 'town': return 'Town';
    case 'capital': return 'Capital City';
    default: return 'Place';
  }
}