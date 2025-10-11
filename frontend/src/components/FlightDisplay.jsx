import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Clock,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  Info,
  ArrowRight,
  Luggage,
  Wifi,
  Coffee,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  AlertTriangle,
} from "lucide-react";

const FlightDisplay = ({
  travelRoute,
  onSelectFlight,
  selectedFlightId = null,
}) => {
  const [expandedFlights, setExpandedFlights] = useState(new Set());
  const [showAllFlights, setShowAllFlights] = useState(false);

  if (
    !travelRoute ||
    travelRoute.travelMode !== "FLIGHT" ||
    !travelRoute.flights
  ) {
    return null;
  }

  const toggleFlightExpansion = (flightId) => {
    const newExpanded = new Set(expandedFlights);
    if (newExpanded.has(flightId)) {
      newExpanded.delete(flightId);
    } else {
      newExpanded.add(flightId);
    }
    setExpandedFlights(newExpanded);
  };

  const formatDuration = (duration) => {
    if (duration.startsWith("PT")) {
      const hours = duration.match(/(\d+)H/)?.[1] || "0";
      const minutes = duration.match(/(\d+)M/)?.[1] || "0";
      return `${hours}h ${minutes}m`;
    }
    return duration;
  };

  const formatTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getAirlineName = (carrierCode) => {
    // You could maintain a mapping of carrier codes to airline names
    const airlines = {
      AA: "American Airlines",
      UA: "United Airlines",
      DL: "Delta Air Lines",
      BA: "British Airways",
      LH: "Lufthansa",
      AF: "Air France",
      KL: "KLM",
      EK: "Emirates",
      QR: "Qatar Airways",
      SQ: "Singapore Airlines",
    };
    return airlines[carrierCode] || carrierCode;
  };

  const getCabinClass = (segments) => {
    // Get the cabin class from the first segment
    const firstSegment = segments[0];
    return firstSegment.cabin || "Economy";
  };

  const displayedFlights = showAllFlights
    ? travelRoute.flights
    : travelRoute.flights.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Route Header */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{travelRoute.from}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{travelRoute.to}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            {formatDate(travelRoute.departureDate)}
          </p>
          <p className="text-xs text-gray-500">
            {travelRoute.flights.length} flight
            {travelRoute.flights.length > 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {/* Flight Options */}
      <div className="space-y-3">
        {displayedFlights.map((flight, index) => {
          const isExpanded = expandedFlights.has(flight.id);
          const isSelected = selectedFlightId === flight.id;
          const mainItinerary = flight.itineraries[0];
          const outboundSegments = mainItinerary?.segments || [];

          return (
            <Card
              key={flight.id}
              className={`transition-all duration-200 hover:shadow-md ${
                isSelected ? "ring-2 ring-blue-500 border-blue-500" : ""
              }`}
            >
              <CardContent className="p-4">
                {/* Flight Summary */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {/* Airline and Flight Info */}
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Plane className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">
                          {getAirlineName(outboundSegments[0]?.carrierCode)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {outboundSegments[0]?.carrierCode}{" "}
                          {outboundSegments[0]?.number}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getCabinClass(outboundSegments)}
                      </Badge>
                      {outboundSegments.some((s) => s.numberOfStops === 0) && (
                        <Badge
                          variant="outline"
                          className="text-xs text-green-600"
                        >
                          Direct
                        </Badge>
                      )}
                    </div>

                    {/* Route and Timing */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {formatTime(outboundSegments[0]?.departure.at)}
                        </span>
                        <span className="text-gray-500">
                          {outboundSegments[0]?.departure.iataCode}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-gray-400">
                        <div className="h-px bg-gray-300 w-8"></div>
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {formatDuration(mainItinerary.duration)}
                        </span>
                        <div className="h-px bg-gray-300 w-8"></div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {formatTime(
                            outboundSegments[outboundSegments.length - 1]
                              ?.arrival.at
                          )}
                        </span>
                        <span className="text-gray-500">
                          {
                            outboundSegments[outboundSegments.length - 1]
                              ?.arrival.iataCode
                          }
                        </span>
                      </div>
                    </div>

                    {/* Stops Info */}
                    {outboundSegments.length > 1 && (
                      <div className="mt-2 text-xs text-orange-600 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          {outboundSegments.length - 1} stop
                          {outboundSegments.length > 2 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price and Actions */}
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold text-green-600">
                      {flight.price.currency}{" "}
                      {parseFloat(flight.price.total).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">per person</div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFlightExpansion(flight.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onSelectFlight && onSelectFlight(flight)}
                        className={isSelected ? "bg-blue-600" : ""}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Flight Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {outboundSegments.map((segment, segIndex) => (
                      <div key={segment.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Plane className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {getAirlineName(segment.carrierCode)}{" "}
                                {segment.number}
                              </p>
                              <p className="text-xs text-gray-500">
                                {segment.aircraft?.code}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-gray-600">
                              Duration: {formatDuration(segment.duration)}
                            </p>
                            {segment.numberOfStops > 0 && (
                              <p className="text-orange-600 text-xs">
                                {segment.numberOfStops} stop
                                {segment.numberOfStops > 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
                          <div>
                            <p className="text-gray-600">Departure</p>
                            <p className="font-medium">
                              {formatTime(segment.departure.at)} -{" "}
                              {segment.departure.iataCode}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(segment.departure.at)}
                              {segment.departure.terminal &&
                                ` • Terminal ${segment.departure.terminal}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Arrival</p>
                            <p className="font-medium">
                              {formatTime(segment.arrival.at)} -{" "}
                              {segment.arrival.iataCode}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(segment.arrival.at)}
                              {segment.arrival.terminal &&
                                ` • Terminal ${segment.arrival.terminal}`}
                            </p>
                          </div>
                        </div>

                        {segIndex < outboundSegments.length - 1 && (
                          <div className="text-center py-2">
                            <Separator />
                            <span className="text-xs text-gray-500 bg-white px-2 relative -top-2">
                              Connection
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Additional Flight Info */}
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t text-xs">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Luggage className="h-3 w-3" />
                        <span>Baggage included</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Coffee className="h-3 w-3" />
                        <span>Meal service</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Wifi className="h-3 w-3" />
                        <span>WiFi available</span>
                      </div>
                    </div>

                    {/* Booking Info */}
                    <div className="bg-yellow-50 p-3 rounded text-sm">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-yellow-800 font-medium">
                            Booking Information
                          </p>
                          <p className="text-yellow-700 text-xs mt-1">
                            {flight.instantTicketingRequired &&
                              "Instant ticketing required. "}
                            {flight.paymentCardRequired &&
                              "Payment card required for booking. "}
                            {flight.lastTicketingDate &&
                              `Must be ticketed by ${formatDate(
                                flight.lastTicketingDate
                              )}.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {travelRoute.flights.length > 3 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllFlights(!showAllFlights)}
            className="w-full"
          >
            {showAllFlights
              ? `Show Less`
              : `Show ${travelRoute.flights.length - 3} More Flights`}
          </Button>
        </div>
      )}

      {/* Price Summary */}
      <Card className="bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-green-800">Price Range</h4>
              <p className="text-sm text-green-600">
                From {travelRoute.estimatedCost.currency}{" "}
                {travelRoute.estimatedCost.min}
                to {travelRoute.estimatedCost.currency}{" "}
                {travelRoute.estimatedCost.max}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600">Estimated travel time</p>
              <p className="font-medium text-green-800">
                {formatDuration(travelRoute.estimatedTravelTime)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlightDisplay;
