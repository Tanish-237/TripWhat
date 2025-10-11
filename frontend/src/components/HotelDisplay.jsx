import React from "react";
import {
  MapPin,
  Users,
  Hotel,
  Star,
  CreditCard,
  Calendar,
  Wifi,
  Car,
  Utensils,
} from "lucide-react";

const HotelDisplay = ({
  hotels = [],
  city,
  checkInDate,
  checkOutDate,
  className = "",
}) => {
  const formatPrice = (price, currency) => {
    const amount = parseFloat(price);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
      BUSINESS_CENTER: "💼",
      FITNESS_CENTER: "🏋️",
      ROOM_SERVICE: "🛎️",
      LAUNDRY: "👕",
      CONCIERGE: "🎩",
      PET_FRIENDLY: "🐕",
    };

    const IconComponent = amenityIcons[amenity];
    return IconComponent ? (
      typeof IconComponent === "string" ? (
        <span className="text-sm">{IconComponent}</span>
      ) : (
        <IconComponent className="w-3 h-3" />
      )
    ) : null;
  };

  const getRatingStars = (offers) => {
    // Mock rating based on price (higher price = higher rating)
    if (!offers || offers.length === 0) return 3;
    const price = parseFloat(offers[0].price.total);
    if (price > 500) return 5;
    if (price > 300) return 4;
    if (price > 150) return 3;
    return 2;
  };

  if (!hotels || hotels.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <Hotel className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-500 text-sm">No hotels available</p>
        {city && <p className="text-xs text-gray-400 mt-1">for {city}</p>}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {city && (
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800 flex items-center">
            <Hotel className="w-5 h-5 mr-2 text-blue-600" />
            Hotels in {city}
          </h4>
          {checkInDate && checkOutDate && (
            <div className="text-sm text-gray-600 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(checkInDate)} - {formatDate(checkOutDate)}
            </div>
          )}
        </div>
      )}

      {/* Hotel List */}
      <div className="space-y-3">
        {hotels.slice(0, 3).map((hotel, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-800">
                      {hotel.hotel.name}
                    </h5>
                    <div className="flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {hotel.hotel.cityCode}
                        {hotel.hotel.address?.cityName &&
                          ` - ${hotel.hotel.address.cityName}`}
                      </span>
                    </div>
                  </div>

                  {hotel.offers && hotel.offers.length > 0 && (
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-green-600">
                        {formatPrice(
                          hotel.offers[0].price.total,
                          hotel.offers[0].price.currency
                        )}
                      </p>
                      <p className="text-xs text-gray-500">per night</p>
                    </div>
                  )}
                </div>

                {/* Rating Stars */}
                <div className="flex items-center mb-2">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className={`w-3 h-3 ${
                        starIndex < getRatingStars(hotel.offers)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getRatingStars(hotel.offers)}.0)
                  </span>
                </div>

                {/* Room Details */}
                {hotel.offers && hotel.offers.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Users className="w-3 h-3 mr-1" />
                    <span>
                      {hotel.offers[0].guests.adults} adult
                      {hotel.offers[0].guests.adults > 1 ? "s" : ""}
                    </span>
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
                )}

                {/* Amenities */}
                {hotel.hotel.amenities && hotel.hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {hotel.hotel.amenities
                      .slice(0, 4)
                      .map((amenity, amenityIndex) => (
                        <span
                          key={amenityIndex}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          title={amenity.replace(/_/g, " ")}
                        >
                          {getAmenityIcon(amenity)}
                          <span className="ml-1 hidden sm:inline">
                            {amenity.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </span>
                      ))}
                    {hotel.hotel.amenities.length > 4 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{hotel.hotel.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Room Description */}
                {hotel.offers && hotel.offers[0]?.room?.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {hotel.offers[0].room.description.text}
                  </p>
                )}

                {/* Bottom Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {hotel.offers?.length || 0} offer
                    {hotel.offers?.length !== 1 ? "s" : ""} available
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More */}
      {hotels.length > 3 && (
        <div className="text-center pt-2">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all {hotels.length} hotels
          </button>
        </div>
      )}

      {/* Summary */}
      {hotels.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 font-medium">
              {hotels.length} hotel{hotels.length !== 1 ? "s" : ""} found
            </span>
            {hotels.some((h) => h.offers && h.offers.length > 0) && (
              <span className="text-blue-600">
                From{" "}
                {formatPrice(
                  Math.min(
                    ...hotels
                      .filter((h) => h.offers && h.offers.length > 0)
                      .map((h) => parseFloat(h.offers[0].price.total))
                  ),
                  hotels.find((h) => h.offers && h.offers.length > 0)?.offers[0]
                    ?.price?.currency || "USD"
                )}{" "}
                per night
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDisplay;
