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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedTripsPage;
