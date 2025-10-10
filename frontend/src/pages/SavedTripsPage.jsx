import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTrip } from "@/contexts/TripContext";
import Navbar from "@/components/Navbar";
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
          (trip.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCityNames(trip).toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          trip.cities?.some((city) =>
            city.name.toLowerCase().includes(searchTerm.toLowerCase())
          ))
      );
      setFilteredTrips(filtered);
    }
  }, [savedTrips, searchTerm]);

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

  const handleMarkAsUpcoming = async (trip) => {
    try {
      setUpdatingId(trip._id);
      const token = getToken();
      
      // Use the trip's original start date
      const tripStartDate = trip.startDate;
      
      await apiMarkTripAsUpcoming(
        trip._id,
        {
          tripStartDate,
        },
        token
      );

      // Remove from saved trips list (it's now in upcoming)
      setSavedTrips((prev) => prev.filter((t) => t._id !== trip._id));
      toast.success("Trip marked as upcoming! 🎉");
    } catch (err) {
      console.error("Error marking trip as upcoming:", err);
      toast.error("Failed to mark trip as upcoming");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveFromUpcoming = async (tripId) => {
    try {
      setUpdatingId(tripId);
      const token = getToken();
      await apiRemoveTripFromUpcoming(tripId, token);

      // Refresh the list to show the trip back in saved
      await fetchSavedTrips();
      toast.success("Trip removed from upcoming");
    } catch (err) {
      console.error("Error removing trip from upcoming:", err);
      toast.error("Failed to remove trip from upcoming");
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
        savedTripId: savedTrip._id,
        _id: savedTrip._id,
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-12 bg-white border border-gray-200 shadow-lg rounded-xl">
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
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar />

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
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
                <h1 className="text-2xl font-bold text-gray-900">
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
                onClick={() => navigate("/plan")}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Plan New Trip
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pt-12">
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
          <Card className="p-12 text-center bg-white border border-gray-200 shadow-lg rounded-xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
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
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                Plan Your First Trip
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 justify-items-center">
            {filteredTrips.map((trip) => (
              <div
                key={trip._id}
                className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full w-full max-w-sm"
              >
                {/* Header Banner */}
                <div className="relative h-28 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
                  {/* Trip Title */}
                  <h3 className="text-xl font-bold text-white mb-1">
                    {getCityNames(trip)}
                  </h3>
                  <p className="text-white/90 text-sm">
                    Trip: {formatDate(trip.startDate)}
                  </p>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip._id);
                    }}
                    disabled={deletingId === trip._id}
                    className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-red-500 text-white rounded-full transition-colors duration-200"
                  >
                    {deletingId === trip._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-4 flex flex-col flex-grow">
                  {/* Status Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      Saved
                    </span>
                    {trip.isUpcoming && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Upcoming
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-600 capitalize">
                      {trip.travelType}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-lg font-bold text-blue-900">{getTotalDays(trip)}</div>
                        <div className="text-xs text-blue-600">Days</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <Sparkles className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-lg font-bold text-green-900">{getTotalActivities(trip)}</div>
                        <div className="text-xs text-green-600">Activities</div>
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
                      <MapPin className="w-3.5 h-3.5 text-pink-600" />
                      <span className="text-xs font-semibold text-gray-700">Destinations</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trip.cities?.map((city, index) => (
                        <span 
                          key={index} 
                          className="px-2.5 py-1 bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 text-xs font-medium rounded-full border border-pink-200"
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
                    {trip.budget && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="capitalize">{trip.budgetMode || 'Budget'}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 mt-auto">
                    <Button
                      onClick={() => handleViewTrip(trip)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Itinerary
                    </Button>

                    {!trip.isUpcoming ? (
                      <Button
                        onClick={() => handleMarkAsUpcoming(trip)}
                        variant="outline"
                        className="w-full border-green-300 text-green-700 hover:bg-green-50 h-9"
                        disabled={updatingId === trip._id}
                      >
                        {updatingId === trip._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 mr-2" />
                        )}
                        Mark as Upcoming
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleRemoveFromUpcoming(trip._id)}
                        variant="outline"
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 h-9"
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
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default SavedTripsPage;
