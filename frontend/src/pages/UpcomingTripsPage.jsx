import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTrip } from "@/contexts/TripContext";
import {
  apiGetUpcomingTrips,
  apiRemoveTripFromUpcoming,
  getToken,
  apiGoogleOauthUrl,
  apiGoogleCreateEvent,
} from "@/lib/api";
import { toast } from "react-toastify";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Star,
  Sparkles,
  Plane,
  Heart,
  Eye,
  CheckCircle2,
} from "lucide-react";

const UpcomingTripsPage = () => {
  const navigate = useNavigate();
  const { updateTripData } = useTrip();

  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [addingTripId, setAddingTripId] = useState(null);
  const [addingAll, setAddingAll] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(
    typeof window !== "undefined" &&
      localStorage.getItem("gcal_connected") === "1"
  );

  useEffect(() => {
    fetchUpcomingTrips();
  }, []);

  // On return from Google OAuth, show toast only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get("gcal");
    const reason = params.get("reason");
    if (gcal === "connected") {
      toast.success("Google Calendar connected! 🎉 You can now add trips.");
      try {
        localStorage.setItem("gcal_connected", "1");
      } catch {}
      setIsGoogleConnected(true);
      // clean query params without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (gcal === "error") {
      toast.error(`Google Calendar connection failed: ${reason || "Unknown"}`);
      try {
        localStorage.removeItem("gcal_connected");
      } catch {}
      setIsGoogleConnected(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
  const connectGoogle = async () => {
    try {
      setIsConnectingGoogle(true);
      const token = getToken();
      if (!token) {
        setError("Please log in first");
        return;
      }
      const { url } = await apiGoogleOauthUrl(token);
      window.location.href = url; // redirect to Google consent
    } catch (err) {
      console.error("Error starting Google OAuth:", err);
      setError(err.message || "Failed to connect Google");
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const addTripToCalendar = async (trip) => {
    try {
      setAddingTripId(trip._id);
      const token = getToken();
      if (!token) {
        setError("Please log in first");
        return;
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const destinationLine = trip.cities?.map((c) => c.name).join(" → ") || "";
      const totalDaysCount = getTotalDays(trip);
      const appBaseUrl = window.location.origin;
      const viewLink = `${appBaseUrl}/upcoming-trips`;

      const days = trip.generatedItinerary?.days || [];
      const baseDate = new Date(trip.tripStartDate);

      const parseTimeToHours = (hhmm) => {
        if (!hhmm || typeof hhmm !== "string") return null;
        const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
        if (Number.isNaN(h)) return null;
        return { h, m: Number.isNaN(m) ? 0 : m };
      };

      if (days.length === 0) {
        // fallback: single event
        const startDate = new Date(baseDate);
        const endDate = trip.tripEndDate
          ? new Date(trip.tripEndDate)
          : new Date(startDate);
        if (!trip.tripEndDate) {
          startDate.setHours(9, 0, 0, 0);
          endDate.setHours(17, 0, 0, 0);
        }
        await apiGoogleCreateEvent(
          {
            summary: trip.title || "Upcoming Trip",
            description: `Trip planned via TripWhat\nDestination: ${destinationLine}\nDuration: ${totalDaysCount} day(s)\n\nManage trip: ${viewLink}`,
            location: destinationLine || undefined,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            timeZone,
          },
          token
        );
      } else {
        for (const day of days) {
          const eventDateStart = new Date(baseDate);
          eventDateStart.setDate(
            baseDate.getDate() + ((day.dayNumber || 1) - 1)
          );
          const eventDateEnd = new Date(eventDateStart);

          // derive time window from first and last timeSlot
          const firstSlot = day.timeSlots?.[0];
          const lastSlot = day.timeSlots?.[day.timeSlots.length - 1];
          const startParsed = parseTimeToHours(firstSlot?.startTime) || {
            h: 9,
            m: 0,
          };
          const endParsed = parseTimeToHours(lastSlot?.endTime) || {
            h: 17,
            m: 0,
          };
          eventDateStart.setHours(startParsed.h, startParsed.m || 0, 0, 0);
          eventDateEnd.setHours(endParsed.h, endParsed.m || 0, 0, 0);

          // Build per-day activity list
          const activities = [];
          try {
            day.timeSlots?.forEach((slot) => {
              slot.activities?.forEach((act) => {
                const timeWindow =
                  slot.startTime && slot.endTime
                    ? `${slot.startTime}-${slot.endTime}`
                    : "";
                const locationStr =
                  typeof act.location === "string"
                    ? act.location
                    : act.location?.name || act.location?.address || "";
                activities.push(
                  `${timeWindow ? `[${timeWindow}] ` : ""}${
                    act.name || "Activity"
                  }${locationStr ? ` @ ${locationStr}` : ""}`
                );
              });
            });
          } catch {}

          const dayTitle = day.title || `Day ${day.dayNumber}`;
          const itineraryBlock = activities.length
            ? `\nActivities:\n- ${activities.slice(0, 12).join("\n- ")}`
            : "";

          const description =
            `Trip planned via TripWhat\nDestination: ${destinationLine}\nDay ${day.dayNumber} of ${totalDaysCount}: ${dayTitle}${itineraryBlock}\n\nManage trip: ${viewLink}`.trim();

          // Create event for this day
          // eslint-disable-next-line no-await-in-loop
          await apiGoogleCreateEvent(
            {
              summary: `${trip.title || "Trip"} - Day ${day.dayNumber}${
                day.title ? `: ${day.title}` : ""
              }`,
              description,
              location: destinationLine || undefined,
              start: eventDateStart.toISOString(),
              end: eventDateEnd.toISOString(),
              timeZone,
            },
            token
          );
        }
      }

      toast.success("Added itinerary days to Google Calendar");
    } catch (err) {
      console.error("Error adding trip to calendar:", err);
      toast.error(err.message || "Failed to add to Google Calendar");
    } finally {
      setAddingTripId(null);
    }
  };

  const addAllUpcomingToCalendar = async () => {
    try {
      setAddingAll(true);
      for (const trip of upcomingTrips) {
        // Sequentially add to avoid rate limiting and provide clear UX
        // eslint-disable-next-line no-await-in-loop
        await addTripToCalendar(trip);
      }
      toast.success("All upcoming trips added to Google Calendar");
    } catch (err) {
      console.error("Error adding all trips:", err);
    } finally {
      setAddingAll(false);
    }
  };

  const fetchUpcomingTrips = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError("Please log in to view upcoming trips");
        return;
      }

      const response = await apiGetUpcomingTrips(token);
      console.log(
        "📊 UpcomingTripsPage - Fetched upcoming trips:",
        response.upcomingTrips
      );
      setUpcomingTrips(response.upcomingTrips || []);
    } catch (err) {
      console.error("Error fetching upcoming trips:", err);
      const errorMessage = err.message || "Failed to fetch upcoming trips";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromUpcoming = async (tripId) => {
    try {
      setRemovingId(tripId);
      const token = getToken();
      await apiRemoveTripFromUpcoming(tripId, token);

      // Remove from local state
      setUpcomingTrips((prev) => prev.filter((trip) => trip._id !== tripId));
      toast.success("Trip removed from upcoming");
    } catch (err) {
      console.error("Error removing trip from upcoming:", err);
      toast.error("Failed to remove trip from upcoming");
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewTrip = async (savedTrip) => {
    try {
      console.log(
        "📊 UpcomingTripsPage - Loading trip with full itinerary:",
        savedTrip
      );

      // Update trip context with saved trip data
      updateTripData({
        startDate: new Date(savedTrip.startDate),
        cities: savedTrip.cities,
        people: savedTrip.people,
        travelType: savedTrip.travelType,
        budget: savedTrip.budget,
        budgetMode: savedTrip.budgetMode,
        generatedItinerary: savedTrip.generatedItinerary,
        itineraryMarkdown: savedTrip.generatedItinerary?.markdown,
      });

      // Navigate to itinerary page
      navigate("/itinerary");
      toast.success("Trip loaded successfully");
    } catch (error) {
      console.error("Error loading trip:", error);
      toast.error("Failed to load trip");
    }
  };

  const getTotalActivities = (trip) => {
    if (!trip.generatedItinerary?.days) return 0;
    return trip.generatedItinerary.days.reduce(
      (sum, day) =>
        sum + day.timeSlots.reduce((s, slot) => s + slot.activities.length, 0),
      0
    );
  };

  const getTotalDays = (trip) => {
    return trip.cities?.reduce((sum, city) => sum + city.days, 0) || 0;
  };

  const getCityNames = (trip) => {
    return trip.cities?.map((c) => c.name).join(" → ") || "";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilTrip = (tripStartDate) => {
    const today = new Date();
    const tripDate = new Date(tripStartDate);
    const diffTime = tripDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTripStatus = (tripStartDate) => {
    const daysUntil = getDaysUntilTrip(tripStartDate);
    if (daysUntil < 0)
      return { text: "Past Due", color: "text-red-600", bg: "bg-red-100" };
    if (daysUntil === 0)
      return { text: "Today!", color: "text-orange-600", bg: "bg-orange-100" };
    if (daysUntil <= 7)
      return {
        text: `${daysUntil} days`,
        color: "text-yellow-600",
        bg: "bg-yellow-100",
      };
    return {
      text: `${daysUntil} days`,
      color: "text-green-600",
      bg: "bg-green-100",
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex items-center justify-center">
        <Card className="p-12 bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Loading Your Upcoming Trips...
              </h3>
              <p className="text-gray-600">Fetching your travel plans</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex items-center justify-center">
        <Card className="p-8 bg-red-50 border border-red-200 max-w-md">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error Loading Trips
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button
                onClick={fetchUpcomingTrips}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/saved-trips")}
                className="text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Saved Trips
              </Button>
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Upcoming Trips
                </h1>
                <p className="text-sm text-gray-600">
                  {upcomingTrips.length}{" "}
                  {upcomingTrips.length === 1 ? "trip" : "trips"} planned
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/saved-trips")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Heart className="w-4 h-4 mr-2" />
                All Saved Trips
              </Button>
              <Button
                onClick={connectGoogle}
                disabled={isConnectingGoogle || isGoogleConnected}
                className={`text-white ${
                  isGoogleConnected
                    ? "bg-green-600 hover:bg-green-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                }`}
              >
                {isGoogleConnected ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : isConnectingGoogle ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                {isGoogleConnected
                  ? "Connected"
                  : isConnectingGoogle
                  ? "Connecting..."
                  : "Connect Google Calendar"}
              </Button>
              <Button
                variant="outline"
                onClick={addAllUpcomingToCalendar}
                disabled={addingAll || upcomingTrips.length === 0}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {addingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                {addingAll ? "Adding All..." : "Add All to Google Calendar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upcoming Trips Grid */}
        {upcomingTrips.length === 0 ? (
          <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Plane className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No upcoming trips yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Mark your saved trips as upcoming to see them here and track your
              travel plans!
            </p>
            <Button
              onClick={() => navigate("/saved-trips")}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Heart className="w-4 h-4 mr-2" />
              View Saved Trips
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingTrips.map((trip) => {
              const status = getTripStatus(trip.tripStartDate);
              const daysUntil = getDaysUntilTrip(trip.tripStartDate);

              return (
                <Card
                  key={trip._id}
                  className="group relative overflow-hidden bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02]"
                >
                  {/* Banner */}
                  <div className="h-48 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 relative">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-4 left-6 right-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 text-green-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Upcoming
                        </span>
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full bg-white/90 ${status.color} ${status.bg}`}
                        >
                          {status.text}
                        </span>
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 text-purple-600 capitalize">
                          {trip.travelType} Travel
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {trip.title}
                      </h2>
                      <p className="text-white/90 text-sm">
                        Trip: {formatDate(trip.tripStartDate)}
                        {trip.tripEndDate &&
                          ` - ${formatDate(trip.tripEndDate)}`}
                      </p>
                    </div>

                    {/* Remove from Upcoming Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromUpcoming(trip._id);
                      }}
                      disabled={removingId === trip._id}
                      className="absolute top-3 right-3 p-2 bg-orange-500/90 hover:bg-orange-600 text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      {removingId === trip._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Trip Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-900">
                          {getTotalDays(trip)}
                        </div>
                        <div className="text-xs text-blue-700">Days</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <Sparkles className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-green-900">
                          {getTotalActivities(trip)}
                        </div>
                        <div className="text-xs text-green-700">Activities</div>
                      </div>
                    </div>

                    {/* Description */}
                    {trip.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {trip.description}
                      </p>
                    )}

                    {/* Cities */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 text-pink-600" />
                        <span className="font-medium">Destinations</span>
                      </div>
                      <div className="text-sm text-gray-800 font-medium">
                        {getCityNames(trip)}
                      </div>
                    </div>

                    {/* Countdown */}
                    {daysUntil >= 0 && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">
                            {daysUntil === 0
                              ? "Your trip is today! 🎉"
                              : daysUntil === 1
                              ? "Your trip is tomorrow! 🚀"
                              : `${daysUntil} days until your trip`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {trip.tags && trip.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {trip.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {trip.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              +{trip.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleViewTrip(trip)}
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Itinerary
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => addTripToCalendar(trip)}
                        disabled={addingTripId === trip._id}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        {addingTripId === trip._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Calendar className="w-4 h-4 mr-2" />
                        )}
                        {addingTripId === trip._id
                          ? "Adding..."
                          : "Add to Google Calendar"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingTripsPage;
