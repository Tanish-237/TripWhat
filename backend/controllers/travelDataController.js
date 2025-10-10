import axios from 'axios';

// Amadeus API Token Management
let amadeusToken = null;
let tokenExpiry = null;

const getAmadeusToken = async () => {
  if (amadeusToken && tokenExpiry && Date.now() < tokenExpiry) {
    return amadeusToken;
  }

  try {
    const response = await axios.post(
      `https://${process.env.AMADEUS_HOSTNAME}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_API_KEY,
        client_secret: process.env.AMADEUS_API_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    amadeusToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000; // 5 min buffer
    return amadeusToken;
  } catch (error) {
    console.error('Error getting Amadeus token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Amadeus API');
  }
};

// Get Flight Offers
export const getFlightOffers = async (req, res) => {
  try {
    const { originCode, destinationCode, departureDate, adults = 1, nonStop = false } = req.query;

    if (!originCode || !destinationCode || !departureDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const token = await getAmadeusToken();

    const response = await axios.get(
      `https://${process.env.AMADEUS_HOSTNAME}/v2/shopping/flight-offers`,
      {
        params: {
          originLocationCode: originCode,
          destinationLocationCode: destinationCode,
          departureDate,
          adults,
          nonStop,
          max: 10,
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('✈️ Flight offers fetched:', response.data.data?.length || 0);

    res.json({
      flights: response.data.data || [],
      meta: response.data.meta || {},
    });
  } catch (error) {
    console.error('Error fetching flights:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch flight offers',
      details: error.response?.data || error.message,
    });
  }
};

// Get Hotel Offers
export const getHotelOffers = async (req, res) => {
  try {
    const { cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, radiusUnit = 'KM' } = req.query;

    if (!cityCode || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const token = await getAmadeusToken();

    // First, search for hotels by city
    const hotelListResponse = await axios.get(
      `https://${process.env.AMADEUS_HOSTNAME}/v1/reference-data/locations/hotels/by-city`,
      {
        params: {
          cityCode,
          radius,
          radiusUnit,
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const hotelIds = hotelListResponse.data.data
      ?.slice(0, 20)
      .map((hotel) => hotel.hotelId)
      .join(',');

    if (!hotelIds) {
      return res.json({ hotels: [] });
    }

    // Then get offers for those hotels
    const offersResponse = await axios.get(
      `https://${process.env.AMADEUS_HOSTNAME}/v3/shopping/hotel-offers`,
      {
        params: {
          hotelIds,
          checkInDate,
          checkOutDate,
          adults,
          roomQuantity: 1,
          currency: 'USD',
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('🏨 Hotel offers fetched:', offersResponse.data.data?.length || 0);

    res.json({
      hotels: offersResponse.data.data || [],
    });
  } catch (error) {
    console.error('Error fetching hotels:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch hotel offers',
      details: error.response?.data || error.message,
    });
  }
};

// Get Events (Ticketmaster)
export const getEvents = async (req, res) => {
  try {
    const { city, startDateTime, endDateTime, size = 20 } = req.query;

    if (!city) {
      return res.status(400).json({ error: 'City is required' });
    }

    // Extract just the city name from full address (e.g., "Mumbai, Maharashtra, India" -> "Mumbai")
    const cityName = city.split(',')[0].trim();

    const params = {
      apikey: process.env.TICKETMASTER_API_KEY,
      city: cityName,
      size,
      sort: 'date,asc',
    };

    if (startDateTime) params.startDateTime = startDateTime;
    if (endDateTime) params.endDateTime = endDateTime;

    console.log('🎭 Fetching events for city:', cityName, 'with params:', params);

    const response = await axios.get(
      'https://app.ticketmaster.com/discovery/v2/events.json',
      { params }
    );

    const events = response.data._embedded?.events || [];

    console.log('🎭 Events fetched:', events.length);

    res.json({
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        type: event.type,
        url: event.url,
        images: event.images,
        dates: {
          start: event.dates.start,
          timezone: event.dates.timezone,
        },
        classifications: event.classifications,
        priceRanges: event.priceRanges,
        venue: event._embedded?.venues?.[0],
      })),
      page: response.data.page,
    });
  } catch (error) {
    console.error('Error fetching events:', error.response?.data || error.message);
    // Return empty array instead of error to not break the page
    res.json({
      events: [],
      error: 'Events not available for this location',
    });
  }
};

// Get Weather Forecast (OpenWeatherMap)
export const getWeatherForecast = async (req, res) => {
  try {
    const { lat, lon, units = 'metric' } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/forecast',
      {
        params: {
          lat,
          lon,
          units,
          appid: process.env.OPENWEATHER_API_KEY,
        },
      }
    );

    console.log('🌤️ Weather forecast fetched for:', response.data.city.name);

    res.json({
      city: response.data.city,
      forecast: response.data.list.map((item) => ({
        dt: item.dt,
        dt_txt: item.dt_txt,
        temp: item.main.temp,
        feels_like: item.main.feels_like,
        temp_min: item.main.temp_min,
        temp_max: item.main.temp_max,
        pressure: item.main.pressure,
        humidity: item.main.humidity,
        weather: item.weather[0],
        clouds: item.clouds.all,
        wind: item.wind,
        visibility: item.visibility,
        pop: item.pop, // Probability of precipitation
      })),
    });
  } catch (error) {
    console.error('Error fetching weather:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch weather forecast',
      details: error.response?.data || error.message,
    });
  }
};

// Get Restaurants (Google Places)
export const getRestaurants = async (req, res) => {
  try {
    const { location, radius = 1500, type = 'restaurant', keyword } = req.query;

    if (!location) {
      return res.status(400).json({ error: 'Location (lat,lng) is required' });
    }

    const params = {
      location,
      radius,
      type,
      key: process.env.GOOGLE_PLACES_API_KEY,
    };

    if (keyword) params.keyword = keyword;

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      { params }
    );

    console.log('🍽️ Restaurants fetched:', response.data.results?.length || 0);

    res.json({
      restaurants: response.data.results.map((place) => ({
        id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level,
        photos: place.photos,
        geometry: place.geometry,
        types: place.types,
        opening_hours: place.opening_hours,
      })),
      status: response.data.status,
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch restaurants',
      details: error.response?.data || error.message,
    });
  }
};
