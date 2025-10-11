import express from "express";
import { travelMeansService } from "../services/travelMeansService.js";
import { amadeusService } from "../services/amadeusService.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Error handler utility
const handleError = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unknown error";
};

/**
 * Get flight inspiration destinations from an origin
 * POST /api/travel/inspiration
 */
router.post("/inspiration", authenticateToken, async (req, res) => {
  try {
    const {
      origin,
      departureDate,
      oneWay,
      duration,
      nonStop,
      maxPrice,
      viewBy,
    } = req.body;

    // Validate required fields
    if (!origin) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: origin",
      });
    }

    const inspirationParams = {
      origin,
      departureDate,
      oneWay,
      duration,
      nonStop,
      maxPrice,
      viewBy,
    };

    const inspirationResponse = await amadeusService.searchFlightInspiration(
      inspirationParams
    );

    return res.json({
      success: true,
      data: inspirationResponse,
    });
  } catch (error) {
    console.error("❌ Error getting flight inspiration:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get flight inspiration",
      error: handleError(error),
    });
  }
});

/**
 * Get travel inspiration with budget and duration filtering
 * POST /api/travel/suggestions
 */
router.post("/suggestions", authenticateToken, async (req, res) => {
  try {
    const {
      originCity,
      departureMonth,
      maxBudget,
      tripDuration,
      preferDirectFlights,
    } = req.body;

    // Validate required fields
    if (!originCity) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: originCity",
      });
    }

    const suggestions = await amadeusService.getTravelInspiration(
      originCity,
      departureMonth,
      maxBudget,
      tripDuration,
      preferDirectFlights
    );

    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("❌ Error getting travel suggestions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get travel suggestions",
      error: handleError(error),
    });
  }
});

/**
 * Search for flights between two locations
 * POST /api/travel/flights/search
 */
router.post("/flights/search", authenticateToken, async (req, res) => {
  try {
    const {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults,
      children,
      infants,
      travelClass,
      nonStop,
      max,
      currencyCode,
    } = req.body;

    // Validate required fields
    if (
      !originLocationCode ||
      !destinationLocationCode ||
      !departureDate ||
      !adults
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: originLocationCode, destinationLocationCode, departureDate, adults",
      });
    }

    const flightSearchParams = {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults: parseInt(adults),
      ...(returnDate && { returnDate }),
      ...(children && { children: parseInt(children) }),
      ...(infants && { infants: parseInt(infants) }),
      ...(travelClass && { travelClass }),
      ...(nonStop !== undefined && { nonStop: Boolean(nonStop) }),
      ...(max && { max: parseInt(max) }),
      ...(currencyCode && { currencyCode }),
    };

    const flights = await amadeusService.searchFlights(flightSearchParams);

    return res.json({
      success: true,
      data: {
        flights,
        searchParams: flightSearchParams,
      },
    });
  } catch (error) {
    console.error("❌ Error searching flights:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search flights",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get airports for a city
 * GET /api/travel/airports/:cityName
 */
router.get("/airports/:cityName", authenticateToken, async (req, res) => {
  try {
    const { cityName } = req.params;

    if (!cityName) {
      return res.status(400).json({
        success: false,
        message: "City name is required",
      });
    }

    const airports = await amadeusService.searchAirports(cityName);

    return res.json({
      success: true,
      data: {
        city: cityName,
        airports,
      },
    });
  } catch (error) {
    console.error(
      `❌ Error getting airports for ${req.params.cityName}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to get airports",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get airport information by IATA code
 * GET /api/travel/airport/:iataCode
 */
router.get("/airport/:iataCode", authenticateToken, async (req, res) => {
  try {
    const { iataCode } = req.params;

    if (!iataCode || iataCode.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Valid IATA code (3 letters) is required",
      });
    }

    const airportInfo = await amadeusService.getAirportInfo(
      iataCode.toUpperCase()
    );

    if (!airportInfo) {
      return res.status(404).json({
        success: false,
        message: `Airport with IATA code ${iataCode} not found`,
      });
    }

    return res.json({
      success: true,
      data: airportInfo,
    });
  } catch (error) {
    console.error(
      `❌ Error getting airport info for ${req.params.iataCode}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to get airport information",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Calculate travel means for a multi-city trip
 * POST /api/travel/means
 */
router.post("/means", authenticateToken, async (req, res) => {
  try {
    const {
      startLocation,
      cities,
      startDate,
      totalDays,
      passengers,
      preferences,
    } = req.body;

    // Validate required fields
    if (
      !startLocation ||
      !cities ||
      !Array.isArray(cities) ||
      cities.length === 0 ||
      !startDate ||
      !totalDays ||
      !passengers
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: startLocation, cities (array), startDate, totalDays, passengers",
      });
    }

    const travelMeansRequest = {
      startLocation,
      cities,
      startDate: new Date(startDate),
      totalDays: parseInt(totalDays),
      passengers: parseInt(passengers),
      preferences,
    };

    const travelMeans = await travelMeansService.calculateTravelMeans(
      travelMeansRequest
    );

    return res.json({
      success: true,
      data: travelMeans,
    });
  } catch (error) {
    console.error("❌ Error calculating travel means:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate travel means",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get travel route between two specific locations
 * POST /api/travel/route
 */
router.post("/route", authenticateToken, async (req, res) => {
  try {
    const { from, to, departureDate, passengers, preferences } = req.body;

    // Validate required fields
    if (!from || !to || !departureDate || !passengers) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: from, to, departureDate, passengers",
      });
    }

    const route = await travelMeansService.getTravelMeansForRoute(
      from,
      to,
      new Date(departureDate),
      parseInt(passengers),
      preferences
    );

    return res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    console.error(
      `❌ Error getting travel route from ${req.body.from} to ${req.body.to}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to get travel route",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get travel recommendations for existing routes
 * POST /api/travel/recommendations
 */
router.post("/recommendations", authenticateToken, async (req, res) => {
  try {
    const { routes } = req.body;

    if (!routes || !Array.isArray(routes)) {
      return res.status(400).json({
        success: false,
        message: "Routes array is required",
      });
    }

    // This would typically be handled by the travel service
    // For now, return a simple response
    const recommendations = [
      {
        type: "COST_EFFECTIVE",
        routeIndices: [0, 1],
        description: "Most budget-friendly options",
        estimatedSavings: 150,
      },
    ];

    return res.json({
      success: true,
      data: {
        recommendations,
      },
    });
  } catch (error) {
    console.error("❌ Error generating travel recommendations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate recommendations",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Test Flight Inspiration API connectivity
 * GET /api/travel/test-inspiration
 */
router.get("/test-inspiration", authenticateToken, async (_req, res) => {
  try {
    console.log("🧪 Testing Flight Inspiration API...");

    // Test with Madrid (MAD) as origin - a common test case
    const testResult = await amadeusService.searchFlightInspiration({
      origin: "MAD",
      departureDate: "2024-12-01,2024-12-31",
      duration: "3,7",
      viewBy: "DESTINATION",
    });

    return res.json({
      success: true,
      message: "Flight Inspiration API test successful",
      testData: {
        totalDestinations: testResult.data.length,
        sampleDestinations: testResult.data.slice(0, 3).map((d) => ({
          destination: d.destination,
          price: d.price.total,
          departureDate: d.departureDate,
        })),
        currency: testResult.meta.currency,
      },
    });
  } catch (error) {
    console.error("❌ Flight Inspiration API test failed:", error);
    return res.status(500).json({
      success: false,
      message: "Flight Inspiration API test failed",
      error: handleError(error),
    });
  }
});

// ========================================
// HOTEL SEARCH ROUTES
// ========================================

/**
 * Search hotels by hotel IDs
 * POST /api/travel/hotels/search
 */
router.post("/hotels/search", authenticateToken, async (req, res) => {
  try {
    const {
      hotelIds,
      adults,
      checkInDate,
      checkOutDate,
      countryOfResidence,
      roomQuantity,
      priceRange,
      currency,
      paymentPolicy,
      boardType,
      includeClosed,
      bestRateOnly,
      lang,
    } = req.body;

    // Validate required fields
    if (!hotelIds || !Array.isArray(hotelIds) || hotelIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: hotelIds (array of hotel IDs)",
      });
    }

    const hotelSearchParams = {
      hotelIds,
      adults: adults ? parseInt(adults) : 1,
      roomQuantity: roomQuantity ? parseInt(roomQuantity) : 1,
      checkInDate,
      checkOutDate,
      countryOfResidence,
      priceRange,
      currency,
      paymentPolicy,
      boardType,
      includeClosed:
        includeClosed !== undefined ? Boolean(includeClosed) : undefined,
      bestRateOnly: bestRateOnly !== undefined ? Boolean(bestRateOnly) : true,
      lang,
    };

    const hotels = await amadeusService.searchHotels(hotelSearchParams);

    return res.json({
      success: true,
      data: {
        hotels: hotels.data,
        searchParams: hotelSearchParams,
        totalResults: hotels.data.length,
        meta: hotels.meta,
      },
    });
  } catch (error) {
    console.error("❌ Error searching hotels:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search hotels",
      error: handleError(error),
    });
  }
});

/**
 * Search hotels by city name
 * POST /api/travel/hotels/city
 */
router.post("/hotels/city", authenticateToken, async (req, res) => {
  try {
    const {
      cityName,
      checkInDate,
      checkOutDate,
      adults,
      rooms,
      currency,
      priceRange,
      boardType,
      countryOfResidence,
    } = req.body;

    // Validate required fields
    if (!cityName || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: cityName, checkInDate, checkOutDate",
      });
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();

    if (checkIn <= today) {
      return res.status(400).json({
        success: false,
        message: "Check-in date must be in the future",
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date",
      });
    }

    const options = {
      currency,
      priceRange,
      boardType,
      countryOfResidence,
    };

    const hotels = await amadeusService.searchHotelsByCity(
      cityName,
      checkInDate,
      checkOutDate,
      adults ? parseInt(adults) : 1,
      rooms ? parseInt(rooms) : 1,
      options
    );

    return res.json({
      success: true,
      data: {
        city: cityName,
        checkInDate,
        checkOutDate,
        hotels: hotels.data,
        totalResults: hotels.data.length,
        searchOptions: options,
        meta: hotels.meta,
      },
    });
  } catch (error) {
    console.error(`❌ Error searching hotels in ${req.body.cityName}:`, error);
    return res.status(500).json({
      success: false,
      message: "Failed to search hotels by city",
      error: handleError(error),
    });
  }
});

/**
 * Get specific hotel offer details
 * GET /api/travel/hotels/offer/:offerId
 */
router.get("/hotels/offer/:offerId", authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { lang } = req.query;

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: "Hotel offer ID is required",
      });
    }

    const hotelOffer = await amadeusService.getHotelOffer(
      offerId,
      lang as string
    );

    return res.json({
      success: true,
      data: hotelOffer,
    });
  } catch (error) {
    console.error(`❌ Error getting hotel offer ${req.params.offerId}:`, error);

    const errorMessage = handleError(error);
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return res.status(404).json({
        success: false,
        message: "Hotel offer not found",
        error: errorMessage,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to get hotel offer",
      error: errorMessage,
    });
  }
});

/**
 * Search hotels for multiple cities (for itinerary)
 * POST /api/travel/hotels/multi-city
 */
router.post("/hotels/multi-city", authenticateToken, async (req, res) => {
  try {
    const { cities, adults, rooms, currency, priceRange, boardType } = req.body;

    // Validate required fields
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required field: cities (array of city search requests)",
      });
    }

    // Validate each city request
    for (const city of cities) {
      if (!city.cityName || !city.checkInDate || !city.checkOutDate) {
        return res.status(400).json({
          success: false,
          message:
            "Each city must have cityName, checkInDate, and checkOutDate",
        });
      }
    }

    const hotelResults = [];

    // Search hotels for each city
    for (const city of cities) {
      try {
        console.log(`🏨 Searching hotels for ${city.cityName}`);

        const options = {
          currency,
          priceRange,
          boardType,
        };

        const cityHotels = await amadeusService.searchHotelsByCity(
          city.cityName,
          city.checkInDate,
          city.checkOutDate,
          adults ? parseInt(adults) : 1,
          rooms ? parseInt(rooms) : 1,
          options
        );

        hotelResults.push({
          city: city.cityName,
          checkInDate: city.checkInDate,
          checkOutDate: city.checkOutDate,
          hotels: cityHotels.data,
          totalResults: cityHotels.data.length,
          success: true,
        });
      } catch (cityError) {
        console.error(
          `❌ Error searching hotels for ${city.cityName}:`,
          cityError
        );
        hotelResults.push({
          city: city.cityName,
          checkInDate: city.checkInDate,
          checkOutDate: city.checkOutDate,
          hotels: [],
          totalResults: 0,
          success: false,
          error: handleError(cityError),
        });
      }
    }

    const totalHotels = hotelResults.reduce(
      (sum, city) => sum + city.totalResults,
      0
    );
    const successfulCities = hotelResults.filter((city) => city.success).length;

    return res.json({
      success: true,
      data: {
        cities: hotelResults,
        summary: {
          totalCities: cities.length,
          successfulCities,
          totalHotels,
          searchParams: {
            adults: adults || 1,
            rooms: rooms || 1,
            currency,
            priceRange,
            boardType,
          },
        },
      },
    });
  } catch (error) {
    console.error("❌ Error searching hotels for multiple cities:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search hotels for multiple cities",
      error: handleError(error),
    });
  }
});

/**
 * Test Hotel Search API connectivity
 * GET /api/travel/hotels/test
 */
router.get("/hotels/test", authenticateToken, async (_req, res) => {
  try {
    console.log("🧪 Testing Hotel Search API...");

    const testResult = await amadeusService.testHotelSearch();

    if (testResult.success) {
      return res.json({
        success: true,
        message: testResult.message,
        data: testResult.sampleData,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: testResult.message,
      });
    }
  } catch (error) {
    console.error("❌ Hotel Search API test failed:", error);
    return res.status(500).json({
      success: false,
      message: "Hotel Search API test failed",
      error: handleError(error),
    });
  }
});

export default router;
