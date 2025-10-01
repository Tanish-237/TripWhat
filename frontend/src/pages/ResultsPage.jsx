import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import {
  Sparkles,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  ArrowLeft,
  Filter,
  Heart,
  Share2,
} from "lucide-react";

const ResultsPage = () => {
  const navigate = useNavigate();
  const { tripData, updateTripData } = useTrip();

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [sortBy, setSortBy] = useState("recommended");

  // Mock trip plans - in real app, this would come from an API
  const generateMockTrips = () => {
    const baseTrips = [
      {
        id: 1,
        title: "Ultimate City Explorer",
        rating: 4.8,
        reviews: 124,
        duration:
          tripData?.cities?.reduce((sum, city) => sum + city.days, 0) || 7,
        price: Math.round((tripData?.budget?.total || 5000) * 0.9),
        originalPrice: tripData?.budget?.total || 5000,
        description: "Perfect blend of culture, cuisine, and adventure",
        highlights: [
          "Premium hotels",
          "Local experiences",
          "Skip-the-line tickets",
        ],
        image:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop",
        tags: ["Popular", "Best Value"],
        itinerary: tripData?.cities || [
          { name: "Paris", days: 3 },
          { name: "Rome", days: 4 },
        ],
      },
      {
        id: 2,
        title: "Budget Backpacker",
        rating: 4.6,
        reviews: 89,
        duration:
          tripData?.cities?.reduce((sum, city) => sum + city.days, 0) || 7,
        price: Math.round((tripData?.budget?.total || 5000) * 0.6),
        originalPrice: Math.round((tripData?.budget?.total || 5000) * 0.8),
        description:
          "Adventure on a budget without compromising on experiences",
        highlights: [
          "Hostels & budget stays",
          "Free walking tours",
          "Local transport",
        ],
        image:
          "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
        tags: ["Budget", "Adventure"],
        itinerary: tripData?.cities || [
          { name: "Barcelona", days: 3 },
          { name: "Amsterdam", days: 4 },
        ],
      },
      {
        id: 3,
        title: "Luxury Getaway",
        rating: 4.9,
        reviews: 67,
        duration:
          tripData?.cities?.reduce((sum, city) => sum + city.days, 0) || 7,
        price: Math.round((tripData?.budget?.total || 5000) * 1.3),
        originalPrice: Math.round((tripData?.budget?.total || 5000) * 1.5),
        description: "Indulge in the finest experiences and accommodations",
        highlights: ["5-star hotels", "Private tours", "Fine dining"],
        image:
          "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
        tags: ["Luxury", "Premium"],
        itinerary: tripData?.cities || [
          { name: "Tokyo", days: 4 },
          { name: "Kyoto", days: 3 },
        ],
      },
      {
        id: 4,
        title: "Family Adventure",
        rating: 4.7,
        reviews: 156,
        duration:
          tripData?.cities?.reduce((sum, city) => sum + city.days, 0) || 7,
        price: Math.round((tripData?.budget?.total || 5000) * 0.8),
        originalPrice: tripData?.budget?.total || 5000,
        description: "Perfect for families with kids of all ages",
        highlights: [
          "Family-friendly hotels",
          "Kid activities",
          "Easy transport",
        ],
        image:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
        tags: ["Family", "Kid-Friendly"],
        itinerary: tripData?.cities || [
          { name: "Orlando", days: 4 },
          { name: "Miami", days: 3 },
        ],
      },
      {
        id: 5,
        title: "Cultural Immersion",
        rating: 4.5,
        reviews: 93,
        duration:
          tripData?.cities?.reduce((sum, city) => sum + city.days, 0) || 7,
        price: Math.round((tripData?.budget?.total || 5000) * 0.7),
        originalPrice: Math.round((tripData?.budget?.total || 5000) * 0.9),
        description: "Deep dive into local culture and traditions",
        highlights: [
          "Local homestays",
          "Cultural workshops",
          "Authentic cuisine",
        ],
        image:
          "https://images.unsplash.com/photo-1539650116574-75c0c6d73c0e?w=400&h=300&fit=crop",
        tags: ["Cultural", "Authentic"],
        itinerary: tripData?.cities || [
          { name: "Delhi", days: 3 },
          { name: "Jaipur", days: 4 },
        ],
      },
      {
        id: 6,
        title: "Solo Explorer",
        rating: 4.4,
        reviews: 78,
        duration:
          tripData?.cities?.reduce((sum, city) => sum + city.days, 0) || 7,
        price: Math.round((tripData?.budget?.total || 5000) * 0.75),
        originalPrice: Math.round((tripData?.budget?.total || 5000) * 0.95),
        description:
          "Designed for independent travelers seeking new connections",
        highlights: [
          "Solo-friendly accommodations",
          "Group activities",
          "Safety features",
        ],
        image:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
        tags: ["Solo", "Social"],
        itinerary: tripData?.cities || [
          { name: "Berlin", days: 3 },
          { name: "Prague", days: 4 },
        ],
      },
    ];

    // Filter trips based on travel type
    if (tripData?.travelType) {
      return baseTrips.filter((trip) => {
        switch (tripData.travelType) {
          case "family":
            return trip.tags.includes("Family");
          case "solo":
            return trip.tags.includes("Solo");
          case "adventure":
            return trip.tags.includes("Adventure");
          case "cultural":
            return trip.tags.includes("Cultural");
          default:
            return true;
        }
      });
    }

    return baseTrips;
  };

  const trips = generateMockTrips();

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    updateTripData({ selectedTrip: trip });
    navigate("/plan/details");
  };

  const handleStepClick = (step) => {
    switch (step) {
      case "destinations":
        navigate("/plan");
        break;
      case "budget":
        navigate("/plan/budget");
        break;
      case "preferences":
        navigate("/plan/preferences");
        break;
      default:
        break;
    }
  };

  const getTagColor = (tag) => {
    const colors = {
      Popular: "bg-blue-100 text-blue-800",
      "Best Value": "bg-green-100 text-green-800",
      Budget: "bg-yellow-100 text-yellow-800",
      Adventure: "bg-orange-100 text-orange-800",
      Luxury: "bg-purple-100 text-purple-800",
      Premium: "bg-pink-100 text-pink-800",
      Family: "bg-indigo-100 text-indigo-800",
      "Kid-Friendly": "bg-teal-100 text-teal-800",
      Cultural: "bg-red-100 text-red-800",
      Authentic: "bg-amber-100 text-amber-800",
      Solo: "bg-cyan-100 text-cyan-800",
      Social: "bg-emerald-100 text-emerald-800",
    };
    return colors[tag] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <TripPlanningSidebar
        currentStep="results"
        onStepClick={handleStepClick}
        tripData={tripData}
      />

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Your Trip Options
                </h1>
                <p className="text-gray-600 mt-1">
                  We found {trips.length} perfect trips based on your
                  preferences
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Sort */}
          <Card className="p-4 mb-8 bg-white border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {trips.length} trip{trips.length !== 1 ? "s" : ""}
              </div>
            </div>
          </Card>

          {/* Trip Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="overflow-hidden bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                onClick={() => handleSelectTrip(trip)}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={trip.image}
                    alt={trip.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {trip.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getTagColor(
                          tag
                        )}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 bg-white/80 hover:bg-white"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 bg-white/80 hover:bg-white"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {trip.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-700">
                        {trip.rating}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({trip.reviews})
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {trip.description}
                  </p>

                  {/* Trip Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{trip.duration} days</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Perfect for {tripData?.people || 2} travelers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {trip.itinerary.map((city) => city.name).join(" → ")}
                      </span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-2">
                      What's included:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {trip.highlights.slice(0, 2).map((highlight, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {highlight}
                        </span>
                      ))}
                      {trip.highlights.length > 2 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{trip.highlights.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${trip.price.toLocaleString()}
                      </div>
                      {trip.originalPrice > trip.price && (
                        <div className="text-sm text-gray-500 line-through">
                          ${trip.originalPrice.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTrip(trip);
                      }}
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate("/plan/preferences")}
              className="px-8 py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Preferences
            </Button>
            <div className="text-sm text-gray-500 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Select a trip to see detailed itinerary
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
