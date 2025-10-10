import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTrip } from "@/contexts/TripContext";
import {
  apiGetSavedTrips,
  apiDeleteSavedTrip,
  apiMarkTripAsUpcoming,
  apiRemoveTripFromUpcoming,
  getToken,
} from "@/lib/api";
import { toast } from "react-toastify";
import {
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Search,
  Filter,
  Heart,
  Eye,
  Edit3,
  Clock,
  Star,
} from "lucide-react";

const SavedTripsPage = () => {
  const navigate = useNavigate();
  const { updateTripData } = useTrip();

  const [savedTrips, setSavedTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripStartDate, setTripStartDate] = useState("");

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  useEffect(() => {
    // Filter trips based on search term
    if (!searchTerm.trim()) {
      setFilteredTrips(savedTrips);
    } else {
      const filtered = savedTrips.filter(
        (trip) =>
          trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
      setFilteredTrips(filtered);
    }
  }, [searchTerm, savedTrips]);

  const fetchSavedTrips = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError("Please log in to view saved trips");
        return;
      }

      const response = await apiGetSavedTrips(token);
      console.log(
        "📊 SavedTripsPage - Fetched saved trips:",
        response.savedTrips
      );
      console.log(
        "📊 SavedTripsPage - First trip itinerary data:",
        response.savedTrips?.[0]?.generatedItinerary
      );
      setSavedTrips(response.savedTrips || []);
    } catch (err) {
      console.error("Error fetching saved trips:", err);
      const errorMessage = err.message || "Failed to fetch saved trips";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm("Are you sure you want to delete this trip?")) {
      return;
    }

    try {
      setDeletingId(tripId);
      const token = getToken();
      await apiDeleteSavedTrip(tripId, token);

      // Remove from local state
      setSavedTrips((prev) => prev.filter((trip) => trip._id !== tripId));
      toast.success("Trip deleted successfully");
    } catch (err) {
      console.error("Error deleting trip:", err);
      toast.error("Failed to delete trip");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsUpcoming = (trip) => {
    setSelectedTrip(trip);
    setTripStartDate("");
    setShowUpcomingModal(true);
  };

  const handleRemoveFromUpcoming = async (tripId) => {
    try {
      setUpdatingId(tripId);
      const token = getToken();
      await apiRemoveTripFromUpcoming(tripId, token);

      // Update local state
      setSavedTrips((prev) =>
        prev.map((trip) =>
          trip._id === tripId
            ? {
                ...trip,
                isUpcoming: false,
                tripStartDate: null,
                tripEndDate: null,
              }
            : trip
        )
      );
      toast.success("Trip removed from upcoming");
    } catch (err) {
      console.error("Error removing trip from upcoming:", err);
      toast.error("Failed to remove trip from upcoming");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSubmitUpcoming = async () => {
    if (!tripStartDate) {
      toast.error("Please select a trip start date");
      return;
    }

    try {
      setUpdatingId(selectedTrip._id);
      const token = getToken();
      await apiMarkTripAsUpcoming(
        selectedTrip._id,
        {
          tripStartDate,
        },
        token
      );

      // Update local state
      setSavedTrips((prev) =>
        prev.map((trip) =>
          trip._id === selectedTrip._id
            ? {
                ...trip,
                isUpcoming: true,
                tripStartDate: new Date(tripStartDate),
                tripEndDate: (() => {
                  const startDate = new Date(tripStartDate);
                  const endDate = new Date(startDate);
                  endDate.setDate(endDate.getDate() + trip.totalDays);
                  return endDate;
                })(),
              }
            : trip
        )
      );
      toast.success("Trip marked as upcoming!");
      setShowUpcomingModal(false);
    } catch (err) {
      console.error("Error marking trip as upcoming:", err);
      toast.error("Failed to mark trip as upcoming");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewTrip = async (savedTrip) => {
    try {
      console.log(
        "📊 SavedTripsPage - Loading trip with full itinerary:",
        savedTrip
      );
      console.log(
        "📊 SavedTripsPage - Generated itinerary:",
        savedTrip.generatedItinerary
      );
      console.log(
        "📊 SavedTripsPage - Days in itinerary:",
        savedTrip.generatedItinerary?.days?.length
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex items-center justify-center">
        <Card className="p-12 bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Loading Your Saved Trips...
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
                onClick={fetchSavedTrips}
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
                onClick={() => navigate("/plan")}
                className="text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Planning
              </Button>
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  My Saved Trips
                </h1>
                <p className="text-sm text-gray-600">
                  {savedTrips.length}{" "}
                  {savedTrips.length === 1 ? "trip" : "trips"} saved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/upcoming-trips")}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Upcoming Trips
              </Button>
              <Button
                onClick={() => navigate("/plan")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Plan New Trip
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search your trips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Trips Grid */}
        {filteredTrips.length === 0 ? (
          <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              {searchTerm ? "No trips found" : "No saved trips yet"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Start planning your first trip and save it for future reference!"}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => navigate("/plan")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Plan Your First Trip
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrips.map((trip) => (
              <Card
                key={trip._id}
                className="group relative overflow-hidden bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02]"
              >
                {/* Banner */}
                <div className="h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 text-blue-600">
                        Saved Trip
                      </span>
                      {trip.isUpcoming && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 text-green-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Upcoming
                        </span>
                      )}
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/90 text-purple-600 capitalize">
                        {trip.travelType} Travel
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {trip.title}
                    </h2>
                    <p className="text-white/90 text-sm">
                      {trip.isUpcoming && trip.tripStartDate
                        ? `Trip: ${formatDate(trip.tripStartDate)}`
                        : `Created: ${formatDate(trip.startDate)}`}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip._id);
                    }}
                    disabled={deletingId === trip._id}
                    className="absolute top-3 right-3 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    {deletingId === trip._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
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
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleViewTrip(trip)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Itinerary
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    {!trip.isUpcoming ? (
                      <Button
                        onClick={() => handleMarkAsUpcoming(trip)}
                        variant="outline"
                        className="w-full border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Mark as Upcoming
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleRemoveFromUpcoming(trip._id)}
                        variant="outline"
                        className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                        disabled={updatingId === trip._id}
                      >
                        {updatingId === trip._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4 mr-2" />
                        )}
                        Remove from Upcoming
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Trip Modal */}
      {showUpcomingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Mark as Upcoming
                  </h3>
                  <p className="text-sm text-gray-600">Set your trip dates</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Start Date *
                  </label>
                  <input
                    type="date"
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {tripStartDate && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Calculated End Date:</strong>{" "}
                      {(() => {
                        const startDate = new Date(tripStartDate);
                        const endDate = new Date(startDate);
                        endDate.setDate(
                          endDate.getDate() + selectedTrip.totalDays
                        );
                        return endDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                      })()}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Based on {selectedTrip.totalDays} day
                      {selectedTrip.totalDays !== 1 ? "s" : ""} trip duration
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected Trip:</strong> {selectedTrip?.title}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowUpcomingModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitUpcoming}
                  disabled={updatingId === selectedTrip?._id || !tripStartDate}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                >
                  {updatingId === selectedTrip?._id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Mark as Upcoming
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SavedTripsPage;
