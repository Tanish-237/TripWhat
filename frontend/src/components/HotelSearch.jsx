import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Hotel,
  Star,
  CreditCard,
  Wifi,
  Car,
  Utensils,
} from "lucide-react";
import { getToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const HotelSearch = ({ cities = [], onHotelResults }) => {
  const { isAuthenticated, user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);

  // Debug: Log the cities prop
  React.useEffect(() => {
    console.log("🏨 HotelSearch received cities:", cities);
    console.log(
      "🏨 City names being searched:",
      cities.map((c) => c.cityName)
    );
  }, [cities]);
  const [searchParams, setSearchParams] = useState({
    adults: 1,
    rooms: 1,
    currency: "USD",
    boardType: "ROOM_ONLY",
    priceRange: "",
  });
  const [hotelResults, setHotelResults] = useState([]);
  const [error, setError] = useState(null);

  const boardTypeOptions = [
    { value: "ROOM_ONLY", label: "Room Only" },
    { value: "BREAKFAST", label: "Breakfast Included" },
    { value: "HALF_BOARD", label: "Half Board (Breakfast + Dinner)" },
    { value: "FULL_BOARD", label: "Full Board (All Meals)" },
    { value: "ALL_INCLUSIVE", label: "All Inclusive" },
  ];

  const currencyOptions = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "GBP", label: "GBP (£)" },
    { value: "INR", label: "INR (₹)" },
    { value: "JPY", label: "JPY (¥)" },
  ];

  const handleSearch = async () => {
    if (!cities || cities.length === 0) {
      setError("No cities provided for hotel search");
      return;
    }

    // Check authentication state
    if (!isAuthenticated) {
      setError("Please log in to search for hotels");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const token = getToken();
      console.log("🔐 Token check:", token ? "✅ Token found" : "❌ No token");
      console.log("👤 User authentication:", {
        isAuthenticated,
        user: user?.name || "No user",
        tokenExists: !!token,
      });

      if (!token) {
        throw new Error(
          "Authentication required. Please log in to search hotels."
        );
      }

      // Format cities for API call
      const cityRequests = cities.map((city) => ({
        cityName: city.name || city.cityName || city,
        checkInDate: city.checkInDate || city.startDate,
        checkOutDate: city.checkOutDate || city.endDate,
      }));

      console.log("🏨 Searching hotels for cities:", cityRequests);
      console.log("🔧 Search parameters:", searchParams);

      const response = await fetch("/api/travel/hotels/multi-city", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cities: cityRequests,
          adults: searchParams.adults,
          rooms: searchParams.rooms,
          currency: searchParams.currency,
          boardType: searchParams.boardType,
          priceRange: searchParams.priceRange || undefined,
        }),
      });

      console.log("📡 API Response status:", response.status);

      const data = await response.json();
      console.log("📦 API Response data:", data);

      if (!response.ok) {
        const errorMessage =
          data.message || `Hotel search failed (${response.status})`;
        console.error("❌ API Error:", errorMessage, data);
        throw new Error(errorMessage);
      }

      console.log("✅ Hotel search results:", data);
      setHotelResults(data.data.cities || []);

      // Notify parent component if callback provided
      if (onHotelResults) {
        onHotelResults(data.data);
      }
    } catch (error) {
      console.error("❌ Hotel search error:", error);
      setError(error.message || "Failed to search hotels. Please try again.");
      setHotelResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatPrice = (price, currency) => {
    const amount = parseFloat(price);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAmenityIcon = (amenity) => {
    const amenityIcons = {
      WIFI: Wifi,
      PARKING: Car,
      RESTAURANT: Utensils,
      BREAKFAST: Utensils,
      GYM: "🏋️",
      POOL: "🏊",
      SPA: "🧖",
      AIRPORT_SHUTTLE: "🚐",
    };

    const IconComponent = amenityIcons[amenity];
    return IconComponent ? (
      typeof IconComponent === "string" ? (
        <span className="text-lg">{IconComponent}</span>
      ) : (
        <IconComponent className="w-4 h-4" />
      )
    ) : null;
  };

  return (
    <div className="space-y-6">
      {/* Search Parameters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Hotel className="w-5 h-5 mr-2 text-blue-600" />
          Hotel Search Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Adults
            </label>
            <input
              type="number"
              min="1"
              max="9"
              value={searchParams.adults}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  adults: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Hotel className="w-4 h-4 inline mr-1" />
              Rooms
            </label>
            <input
              type="number"
              min="1"
              max="9"
              value={searchParams.rooms}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  rooms: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CreditCard className="w-4 h-4 inline mr-1" />
              Currency
            </label>
            <select
              value={searchParams.currency}
              onChange={(e) =>
                setSearchParams({ ...searchParams, currency: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Utensils className="w-4 h-4 inline mr-1" />
              Board Type
            </label>
            <select
              value={searchParams.boardType}
              onChange={(e) =>
                setSearchParams({ ...searchParams, boardType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {boardTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              💰 Price Range
            </label>
            <input
              type="text"
              placeholder="e.g., 100-300"
              value={searchParams.priceRange}
              onChange={(e) =>
                setSearchParams({ ...searchParams, priceRange: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching || cities.length === 0}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Searching Hotels...
            </>
          ) : (
            <>
              <Hotel className="w-4 h-4 mr-2" />
              Search Hotels ({cities.length} cities)
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Hotel Results */}
      {hotelResults.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">
            Hotel Search Results (
            {hotelResults.reduce((sum, city) => sum + city.totalResults, 0)}{" "}
            hotels found)
          </h3>

          {hotelResults.map((cityResult, cityIndex) => (
            <div
              key={cityIndex}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                <h4 className="text-lg font-semibold flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {cityResult.city}
                </h4>
                <p className="text-blue-100 text-sm flex items-center mt-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  {cityResult.checkInDate} to {cityResult.checkOutDate}
                  <span className="ml-4">
                    <Hotel className="w-4 h-4 inline mr-1" />
                    {cityResult.totalResults} hotels found
                  </span>
                </p>
              </div>

              {cityResult.success ? (
                <div className="p-4">
                  {cityResult.hotels.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {cityResult.hotels
                        .slice(0, 4)
                        .map((hotel, hotelIndex) => (
                          <div
                            key={hotelIndex}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-semibold text-gray-800 text-lg">
                                  {hotel.hotel.name}
                                </h5>
                                <p className="text-gray-600 text-sm flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {hotel.hotel.cityCode}
                                  {hotel.hotel.address?.cityName &&
                                    ` - ${hotel.hotel.address.cityName}`}
                                </p>
                              </div>
                              <div className="text-right">
                                {hotel.offers && hotel.offers.length > 0 && (
                                  <div>
                                    <p className="text-2xl font-bold text-green-600">
                                      {formatPrice(
                                        hotel.offers[0].price.total,
                                        hotel.offers[0].price.currency
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      per night
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {hotel.offers && hotel.offers.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Users className="w-4 h-4 mr-1" />
                                  {hotel.offers[0].guests.adults} adult
                                  {hotel.offers[0].guests.adults > 1 ? "s" : ""}
                                  {hotel.offers[0].room.typeEstimated && (
                                    <span className="ml-2">
                                      •{" "}
                                      {hotel.offers[0].room.typeEstimated.category?.replace(
                                        /_/g,
                                        " "
                                      )}
                                    </span>
                                  )}
                                </div>

                                {hotel.offers[0].room.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {hotel.offers[0].room.description.text}
                                  </p>
                                )}

                                {hotel.hotel.amenities &&
                                  hotel.hotel.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {hotel.hotel.amenities
                                        .slice(0, 4)
                                        .map((amenity, amenityIndex) => (
                                          <span
                                            key={amenityIndex}
                                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                          >
                                            {getAmenityIcon(amenity)}
                                            <span className="ml-1">
                                              {amenity.replace(/_/g, " ")}
                                            </span>
                                          </span>
                                        ))}
                                    </div>
                                  )}

                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                  <div className="text-xs text-gray-500">
                                    {hotel.offers.length} offer
                                    {hotel.offers.length > 1 ? "s" : ""}{" "}
                                    available
                                  </div>
                                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    View Details
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Hotel className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No hotels found for {cityResult.city}</p>
                    </div>
                  )}

                  {cityResult.hotels.length > 4 && (
                    <div className="text-center mt-4">
                      <button className="text-blue-600 hover:text-blue-800 font-medium">
                        View all {cityResult.totalResults} hotels in{" "}
                        {cityResult.city}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-red-600">
                  <p>❌ Failed to search hotels for {cityResult.city}</p>
                  {cityResult.error && (
                    <p className="text-sm text-gray-600 mt-1">
                      {cityResult.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isSearching &&
        hotelResults.length === 0 &&
        !error &&
        cities.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            <Hotel className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">Ready to search hotels</p>
            <p className="text-sm">
              Click the search button to find hotels in your selected cities
            </p>
          </div>
        )}

      {cities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg mb-2">No cities selected</p>
          <p className="text-sm">
            Add cities to your itinerary to search for hotels
          </p>
        </div>
      )}
    </div>
  );
};

export default HotelSearch;
