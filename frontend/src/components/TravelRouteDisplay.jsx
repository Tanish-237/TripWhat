import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlightDisplay from "./FlightDisplay";
import {
  MapPin,
  ArrowRight,
  Clock,
  DollarSign,
  Plane,
  Car,
  Train,
  Bus,
  Calendar,
  Route,
  AlertCircle,
  CheckCircle,
  Info,
  Star,
  TrendingDown,
  Zap,
  Shield,
} from "lucide-react";

const TravelRouteDisplay = ({
  travelMeans,
  onSelectRoute,
  selectedRoutes = {},
}) => {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Debug log to understand the data structure
  console.log("🛫 TravelRouteDisplay received travelMeans:", travelMeans);
  console.log(
    "🛫 TravelRouteDisplay totalEstimatedCost:",
    travelMeans?.totalEstimatedCost
  );

  if (!travelMeans || !travelMeans.routes || travelMeans.routes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Travel Information Available
          </h3>
          <p className="text-gray-600">
            Travel routes and flight information will appear here once
            available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTravelModeIcon = (mode) => {
    switch (mode) {
      case "FLIGHT":
        return <Plane className="h-4 w-4" />;
      case "GROUND":
        return <Car className="h-4 w-4" />;
      case "MIXED":
        return <Route className="h-4 w-4" />;
      default:
        return <Route className="h-4 w-4" />;
    }
  };

  const getTravelModeColor = (mode) => {
    switch (mode) {
      case "FLIGHT":
        return "bg-blue-100 text-blue-800";
      case "GROUND":
        return "bg-green-100 text-green-800";
      case "MIXED":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case "COST_EFFECTIVE":
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case "TIME_EFFICIENT":
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case "DIRECT_FLIGHTS":
        return <Plane className="h-4 w-4 text-blue-600" />;
      case "COMFORT":
        return <Star className="h-4 w-4 text-purple-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount, currency) => {
    if (
      amount === undefined ||
      amount === null ||
      currency === undefined ||
      currency === null
    ) {
      return "N/A";
    }
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      return `${currency || "USD"} ${amount}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Travel Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="h-5 w-5 text-blue-600" />
            <span>Travel Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium text-blue-900">Total Cost</h3>
              <p className="text-lg font-bold text-blue-800">
                {travelMeans.totalEstimatedCost ? (
                  <>
                    {formatCurrency(
                      travelMeans.totalEstimatedCost.min,
                      travelMeans.totalEstimatedCost.currency
                    )}{" "}
                    -{" "}
                    {formatCurrency(
                      travelMeans.totalEstimatedCost.max,
                      travelMeans.totalEstimatedCost.currency
                    )}
                  </>
                ) : (
                  "Cost not available"
                )}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-green-900">Total Travel Time</h3>
              <p className="text-lg font-bold text-green-800">
                {travelMeans.totalTravelTime || "Time not available"}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Route className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-purple-900">Total Routes</h3>
              <p className="text-lg font-bold text-purple-800">
                {travelMeans.routes.length} segments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {travelMeans.recommendations &&
        travelMeans.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <span>Travel Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {travelMeans.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm capitalize">
                        {rec.type.toLowerCase().replace("_", " ")}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {rec.description}
                      </p>
                      {rec.estimatedSavings && (
                        <p className="text-xs text-green-600 mt-1">
                          Save up to ${rec.estimatedSavings}
                        </p>
                      )}
                      {rec.estimatedTimeSaving && (
                        <p className="text-xs text-blue-600 mt-1">
                          {rec.estimatedTimeSaving}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Route Details */}
      <Card>
        <CardHeader>
          <CardTitle>Route Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Route Overview */}
              <div className="space-y-3">
                {travelMeans.routes.map((route, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">{route.from}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{route.to}</span>
                      </div>
                      <Badge className={getTravelModeColor(route.travelMode)}>
                        <div className="flex items-center space-x-1">
                          {getTravelModeIcon(route.travelMode)}
                          <span className="text-xs">{route.travelMode}</span>
                        </div>
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(
                            route.estimatedCost.min,
                            route.estimatedCost.currency
                          )}{" "}
                          -{" "}
                          {formatCurrency(
                            route.estimatedCost.max,
                            route.estimatedCost.currency
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {route.estimatedTravelTime}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-600">
                          {new Date(route.departureDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6 mt-4">
              {/* Detailed Route Information */}
              {travelMeans.routes.map((route, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Route {index + 1}: {route.from} → {route.to}
                    </h3>
                    <Badge className={getTravelModeColor(route.travelMode)}>
                      <div className="flex items-center space-x-1">
                        {getTravelModeIcon(route.travelMode)}
                        <span>{route.travelMode}</span>
                      </div>
                    </Badge>
                  </div>

                  {/* Flight Information */}
                  {route.travelMode === "FLIGHT" && route.flights && (
                    <FlightDisplay
                      travelRoute={route}
                      onSelectFlight={(flight) =>
                        onSelectRoute && onSelectRoute(index, "flight", flight)
                      }
                      selectedFlightId={selectedRoutes[index]?.flight?.id}
                    />
                  )}

                  {/* Ground Transport Information */}
                  {(route.travelMode === "GROUND" ||
                    route.travelMode === "MIXED") &&
                    route.groundTransport && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Ground Transport Options
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {route.groundTransport.map((transport, tIndex) => (
                              <div
                                key={tIndex}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  {transport.mode === "TRAIN" && (
                                    <Train className="h-5 w-5 text-blue-600" />
                                  )}
                                  {transport.mode === "BUS" && (
                                    <Bus className="h-5 w-5 text-green-600" />
                                  )}
                                  {transport.mode === "CAR_RENTAL" && (
                                    <Car className="h-5 w-5 text-purple-600" />
                                  )}
                                  {transport.mode === "TAXI" && (
                                    <Car className="h-5 w-5 text-yellow-600" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">
                                      {transport.mode.replace("_", " ")}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {transport.description}
                                    </p>
                                    {transport.provider && (
                                      <p className="text-xs text-gray-500">
                                        {transport.provider}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-sm">
                                    {formatCurrency(
                                      transport.cost.amount,
                                      transport.cost.currency
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {transport.duration}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1"
                                    onClick={() =>
                                      onSelectRoute &&
                                      onSelectRoute(index, "ground", transport)
                                    }
                                  >
                                    Select
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {index < travelMeans.routes.length - 1 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-px bg-gray-300 w-full"></div>
                      <div className="px-4 bg-white">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="h-px bg-gray-300 w-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TravelRouteDisplay;
