<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useTrip } from "@/contexts/TripContext.jsx";
import { getToken, apiGetCompletedTrips, apiGetSavedTrip } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Calendar, Users, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

const CompletedTripsPage = () => {
  const { user } = useAuth();
  const { updateTripData } = useTrip();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        const res = await apiGetCompletedTrips(token, {
          anyPercent: true,
          limit: 50,
        });
        console.log("🔍 Completed trips API response:", res);
        console.log(
          "🔍 Number of completed trips found:",
          res.completedTrips?.length || 0
        );

        // Debug each trip's completion status
        if (res.completedTrips && res.completedTrips.length > 0) {
          res.completedTrips.forEach((trip, i) => {
            console.log(
              `🔍 Trip ${i + 1}: "${trip.title}" - ${
                trip.completionPercent
              }% complete`
            );
          });
        } else {
          console.log("🔍 No completed trips found");
        }

        setTrips(res.completedTrips || []);
      } catch (e) {
        console.error("❌ Error fetching completed trips:", e);
        setError(e.message || "Failed to load completed trips");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleViewTrip = async (savedTrip) => {
    try {
      console.log(
        "📊 CompletedTripsPage - Loading trip with full itinerary:",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Completed Trips
            </h1>
            {!loading && !error && (
              <p className="text-gray-600 mt-2">
                {trips.length === 0
                  ? "Start marking activities as completed to see your progress here!"
                  : `${trips.length} trip${
                      trips.length === 1 ? "" : "s"
                    } with progress tracked`}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-700">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : trips.length === 0 ? (
          <div className="text-gray-600">No completed trips yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const coverDay = trip.generatedItinerary?.days?.[0];
              const firstActivity = coverDay?.timeSlots?.[0]?.activities?.[0];
              const imageUrl =
                firstActivity?.imageUrl ||
                `https://picsum.photos/seed/${encodeURIComponent(
                  trip.title
                )}/800/600`;
              return (
                <Card
                  key={trip._id}
                  className="overflow-hidden border border-gray-200 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 hover:shadow-xl transition-all"
                >
                  <div className="relative h-48">
                    {/* <img
                      src={imageUrl}
                      alt={trip.title}
                      className="w-full h-full object-cover"
                    /> */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />{" "}
                      {trip.completionPercent}%
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {trip.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {trip.totalDays} days
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {trip.people} travelers
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />{" "}
                        {trip.generatedItinerary?.days?.reduce(
                          (s, d) =>
                            s +
                            (d.timeSlots || []).reduce(
                              (s2, t) => s2 + (t.activities || []).length,
                              0
                            ),
                          0
                        ) || 0}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={() => handleViewTrip(trip)}
                    >
                      View Itinerary
                    </Button>
                  </div>
                </Card>
=======
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useTrip } from "@/contexts/TripContext";
import {
  apiGetCompletedTrips,
  apiRemoveTripFromUpcoming,
  getToken,
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

// Add custom CSS for floating animation
const floatingAnimation = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-10px) rotate(3deg); }
    66% { transform: translateY(5px) rotate(-2deg); }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = floatingAnimation;
  document.head.appendChild(style);
}

const CompletedTripsPage = () => {
  const navigate = useNavigate();
  const { updateTripData } = useTrip();

  const [completedTrips, setCompletedTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchCompletedTrips();
  }, []);

  const fetchCompletedTrips = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError("Please log in to view completed trips");
        return;
      }

      const response = await apiGetCompletedTrips(token);
      console.log(
        "📊 CompletedTripsPage - Fetched completed trips:",
        response.completedTrips
      );
      setCompletedTrips(response.completedTrips || []);
    } catch (err) {
      console.error("Error fetching completed trips:", err);
      const errorMessage = err.message || "Failed to fetch completed trips";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTrip = async (trip) => {
    try {
      console.log("📊 CompletedTripsPage - Loading trip:", trip);
      updateTripData({
        cities: trip.cities || [],
        startDate: trip.startDate,
        startLocation: trip.startLocation,
        people: trip.people || trip.numberOfPeople || 1,
        travelType: trip.travelType || "leisure",
        budget: trip.budget,
        generatedItinerary: trip.generatedItinerary,
      });
      navigate("/itinerary");
    } catch (error) {
      console.error("Error loading trip:", error);
      toast.error("Failed to load trip details");
    }
  };

  const handleRemoveFromUpcoming = async (tripId) => {
    try {
      setRemovingId(tripId);
      const token = getToken();
      await apiRemoveTripFromUpcoming(tripId, token);

      // Remove from local state
      setCompletedTrips((prev) => prev.filter((trip) => trip._id !== tripId));
      toast.success("Trip moved to saved");
    } catch (err) {
      console.error("Error removing trip from upcoming:", err);
      toast.error("Failed to move trip to saved");
    } finally {
      setRemovingId(null);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-12 bg-white border border-gray-200 shadow-lg rounded-xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Loading Your Completed Trips...
              </h3>
              <p className="text-gray-600">Fetching your travel memories</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 bg-red-50 border border-red-200 max-w-md">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error Loading Trips
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button
                onClick={fetchCompletedTrips}
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
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/saved-trips")}
                  className="text-gray-600 hover:text-gray-900 border-gray-300 hover:bg-gray-50 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                  Back to Saved Trips
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Completed Trips
                  </h1>
                  <p className="text-sm text-gray-600">
                    {completedTrips.length}{" "}
                    {completedTrips.length === 1 ? "trip" : "trips"} completed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate("/plan")}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Plan New Trip
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Trips Grid */}
        {completedTrips.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-gray-200 shadow-lg rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-600 rounded-2xl flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No completed trips yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your completed trips will appear here once your upcoming trips are finished!
            </p>
            <Button
              onClick={() => navigate("/upcoming-trips")}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Clock className="w-4 h-4 mr-2" />
              View Upcoming Trips
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 justify-items-center">
            {completedTrips.map((trip) => {
              return (
                <div
                  key={trip._id}
                  className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full w-full max-w-sm"
                >
                  {/* Header Banner */}
                  <div className="relative h-28 bg-gradient-to-br from-green-500 via-blue-500 to-purple-500 p-4">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {getCityNames(trip)}
                    </h3>
                    <p className="text-white/90 text-sm">
                      Completed: {formatDate(trip.tripStartDate)}
                    </p>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    {/* Status Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-600 capitalize">
                        {trip.travelType}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="text-lg font-bold text-green-900">{getTotalDays(trip)}</div>
                          <div className="text-xs text-green-600">Days</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-lg font-bold text-blue-900">{getTotalActivities(trip)}</div>
                          <div className="text-xs text-blue-600">Activities</div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {trip.description && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {trip.description}
                        </p>
                      </div>
                    )}

                    {/* Destinations */}
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-gray-700">Destinations</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {trip.cities?.map((city, index) => (
                          <span 
                            key={index} 
                            className="px-2.5 py-1 bg-gradient-to-r from-purple-50 to-green-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200"
                          >
                            {city.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="mb-4 flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{trip.people} {trip.people === 1 ? 'person' : 'people'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 mt-auto">
                      <Button
                        onClick={() => handleViewTrip(trip)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-9"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Trip Memories
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveFromUpcoming(trip._id)}
                        disabled={removingId === trip._id}
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 h-9"
                      >
                        {removingId === trip._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowLeft className="w-4 h-4 mr-2" />
                        )}
                        {removingId === trip._id ? "Removing..." : "Move to Saved"}
                      </Button>
                    </div>
                  </div>
                </div>
>>>>>>> origin/master
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedTripsPage;
