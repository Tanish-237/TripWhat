import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  List,
  Users,
  Heart,
  Share2,
  Navigation,
  Sparkles,
} from "lucide-react";

const ItineraryPage = () => {
  console.log("🎯🎯🎯 ITINERARY PAGE IS LOADING 🎯🎯🎯");
  
  const navigate = useNavigate();
  const { tripData } = useTrip();
  const [activeTab, setActiveTab] = useState("itinerary");
  const [selectedDay, setSelectedDay] = useState(1);

  const itinerary = tripData?.generatedItinerary?.itinerary;

  console.log("📊 ItineraryPage - tripData:", tripData);
  console.log("📊 ItineraryPage - itinerary:", itinerary);

  useEffect(() => {
    if (!itinerary) {
      console.warn("⚠️ No itinerary data found");
    } else {
      console.log("✅ Itinerary data exists!");
    }
  }, [itinerary]);

  if (!itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Itinerary Found</h2>
          <p className="text-gray-600 mb-4">Please generate an itinerary first.</p>
          <Button onClick={() => navigate("/plan/results")}>
            Go to Results
          </Button>
        </Card>
      </div>
    );
  }

  const { days, tripMetadata } = itinerary;
  const selectedDayData = days?.find((d) => d.dayNumber === selectedDay) || days?.[0];

  const getTotalActivities = () => {
    return days.reduce((sum, day) => 
      sum + day.timeSlots.reduce((s, slot) => s + slot.activities.length, 0), 0
    );
  };

  const getActivityImage = (activity) => {
    // Use activity image if available, otherwise use a placeholder
    return activity.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(activity.category || 'travel')}`;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Trip Overview & Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/plan/results")}
            className="mb-4 -ml-2"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {tripMetadata.destination}
          </h1>
          <p className="text-sm text-gray-600">
            {tripMetadata.duration} days • {tripMetadata.numberOfPeople} travelers
          </p>
          
          <div className="mt-4 flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 capitalize">
              {tripMetadata.travelType}
            </span>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
              ${tripMetadata.budget?.perDay || 0}/day
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{days.length}</div>
              <div className="text-xs text-blue-700">Days</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{getTotalActivities()}</div>
              <div className="text-xs text-green-700">Activities</div>
            </div>
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Your Journey</h3>
          <div className="space-y-2">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedDay === day.dayNumber
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Day {day.dayNumber}</div>
                    <div className={`text-xs mt-1 ${selectedDay === day.dayNumber ? 'text-blue-100' : 'text-gray-500'}`}>
                      {day.title} {day.city && `• ${day.city}`}
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${selectedDay === day.dayNumber ? 'text-blue-100' : 'text-gray-500'}`}>
                    {day.timeSlots.reduce((sum, slot) => sum + slot.activities.length, 0)} activities
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button className="w-full" variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share Itinerary
          </Button>
          <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
            <Heart className="w-4 h-4 mr-2" />
            Save Trip
          </Button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-8 pt-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "itinerary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              Itinerary
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "map"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <MapIcon className="w-4 h-4 inline mr-2" />
              Map
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "calendar"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Calendar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Itinerary Tab */}
          {activeTab === "itinerary" && selectedDayData && (
            <div className="h-full overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                {/* Day Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">
                        Day {selectedDayData.dayNumber}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {selectedDayData.title}
                        {selectedDayData.city && ` • ${selectedDayData.city}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                        disabled={selectedDay === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSelectedDay(Math.min(days.length, selectedDay + 1))}
                        disabled={selectedDay === days.length}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-8">
                  {selectedDayData.timeSlots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="relative">
                      {/* Time Period Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          slot.period === 'morning' ? 'bg-yellow-100 text-yellow-800' :
                          slot.period === 'afternoon' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {slot.period.charAt(0).toUpperCase() + slot.period.slice(1)}
                        </div>
                        <div className="text-sm text-gray-500">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>

                      {/* Activities */}
                      <div className="space-y-4 ml-4">
                        {slot.activities.map((activity, actIndex) => (
                          <Card
                            key={actIndex}
                            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          >
                            <div className="flex">
                              {/* Activity Image */}
                              <div className="w-48 h-48 flex-shrink-0 relative overflow-hidden bg-gray-100">
                                <img
                                  src={getActivityImage(activity)}
                                  alt={activity.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = `https://via.placeholder.com/400x300/3b82f6/ffffff?text=${encodeURIComponent(activity.name)}`;
                                  }}
                                />
                                <div className="absolute top-2 right-2">
                                  <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                                    <Heart className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              </div>

                              {/* Activity Details */}
                              <div className="flex-1 p-6">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                      {activity.name}
                                    </h3>
                                    {activity.category && (
                                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 capitalize">
                                        {activity.category}
                                      </span>
                                    )}
                                  </div>
                                  <Button variant="outline" size="sm">
                                    Details
                                  </Button>
                                </div>

                                {activity.description && (
                                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {activity.duration}
                                  </div>
                                  {activity.estimatedCost && (
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="w-4 h-4" />
                                      {activity.estimatedCost}
                                    </div>
                                  )}
                                  {activity.location && (
                                    <div className="flex items-center gap-1">
                                      <Navigation className="w-4 h-4" />
                                      <button className="text-blue-600 hover:underline">
                                        Get Directions
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Connector Line */}
                      {slotIndex < selectedDayData.timeSlots.length - 1 && (
                        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Map Tab */}
          {activeTab === "map" && (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <Card className="p-8 text-center">
                <MapIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Map View Coming Soon</h3>
                <p className="text-gray-600">
                  Interactive map with activity markers will be available shortly!
                </p>
              </Card>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === "calendar" && (
            <div className="h-full overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendar View</h2>
                <div className="grid grid-cols-7 gap-4">
                  {days.map((day) => (
                    <Card
                      key={day.dayNumber}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedDay(day.dayNumber);
                        setActiveTab("itinerary");
                      }}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{day.dayNumber}</div>
                        <div className="text-xs text-gray-500 mt-1">Day {day.dayNumber}</div>
                        <div className="mt-2 text-xs text-gray-600">
                          {day.timeSlots.reduce((sum, slot) => sum + slot.activities.length, 0)} activities
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItineraryPage;
