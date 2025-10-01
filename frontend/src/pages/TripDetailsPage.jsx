import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Plane,
  Hotel,
  Utensils,
  Calendar as EventIcon,
  Sun,
  Cloud,
  CloudRain,
  ArrowLeft,
  Download,
  Share2,
  Heart,
  Star,
  Navigation,
  Phone,
  Globe,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const TripDetailsPage = () => {
  const navigate = useNavigate();
  const { tripData } = useTrip();
  const [activeTab, setActiveTab] = useState("overview");
  const trip = tripData?.selectedTrip;

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
      case "results":
        navigate("/plan/results");
        break;
      default:
        break;
    }
  };

  if (!trip) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <TripPlanningSidebar
          currentStep="results"
          onStepClick={handleStepClick}
          tripData={tripData}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Trip Selected
            </h2>
            <Button
              onClick={() => navigate("/plan/results")}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: MapPin },
    { id: "itinerary", label: "Itinerary", icon: Calendar },
    { id: "budget", label: "Budget", icon: DollarSign },
    { id: "weather", label: "Weather", icon: Sun },
    { id: "accommodation", label: "Hotels", icon: Hotel },
    { id: "activities", label: "Activities", icon: EventIcon },
  ];

  const mockItinerary = [
    {
      day: 1,
      city: "Paris",
      date: "2024-03-15",
      activities: [
        { time: "09:00", title: "Arrive at CDG Airport", type: "travel" },
        { time: "11:00", title: "Check into Hotel", type: "accommodation" },
        { time: "14:00", title: "Lunch at Local Bistro", type: "food" },
        { time: "16:00", title: "Eiffel Tower Visit", type: "activity" },
        { time: "19:00", title: "Seine River Cruise", type: "activity" },
      ],
    },
    {
      day: 2,
      city: "Paris",
      date: "2024-03-16",
      activities: [
        { time: "09:00", title: "Louvre Museum", type: "activity" },
        { time: "12:00", title: "Lunch in Montmartre", type: "food" },
        { time: "14:00", title: "Sacré-Cœur Basilica", type: "activity" },
        {
          time: "17:00",
          title: "Shopping at Champs-Élysées",
          type: "activity",
        },
        {
          time: "20:00",
          title: "Dinner at Fine Dining Restaurant",
          type: "food",
        },
      ],
    },
    {
      day: 3,
      city: "Rome",
      date: "2024-03-17",
      activities: [
        { time: "08:00", title: "Flight to Rome", type: "travel" },
        { time: "11:00", title: "Check into Hotel", type: "accommodation" },
        { time: "14:00", title: "Colosseum Tour", type: "activity" },
        { time: "16:30", title: "Roman Forum", type: "activity" },
        { time: "19:00", title: "Traditional Italian Dinner", type: "food" },
      ],
    },
  ];

  const mockBudget = {
    total: trip.price,
    breakdown: [
      {
        category: "Flights",
        amount: Math.round(trip.price * 0.4),
        percentage: 40,
        icon: Plane,
      },
      {
        category: "Accommodation",
        amount: Math.round(trip.price * 0.3),
        percentage: 30,
        icon: Hotel,
      },
      {
        category: "Food & Dining",
        amount: Math.round(trip.price * 0.2),
        percentage: 20,
        icon: Utensils,
      },
      {
        category: "Activities",
        amount: Math.round(trip.price * 0.1),
        percentage: 10,
        icon: EventIcon,
      },
    ],
  };

  const mockWeather = [
    {
      date: "2024-03-15",
      city: "Paris",
      high: 15,
      low: 8,
      condition: "sunny",
      icon: Sun,
    },
    {
      date: "2024-03-16",
      city: "Paris",
      high: 13,
      low: 6,
      condition: "cloudy",
      icon: Cloud,
    },
    {
      date: "2024-03-17",
      city: "Rome",
      high: 18,
      low: 10,
      condition: "sunny",
      icon: Sun,
    },
    {
      date: "2024-03-18",
      city: "Rome",
      high: 16,
      low: 9,
      condition: "rainy",
      icon: CloudRain,
    },
  ];

  const mockHotels = [
    {
      name: "Hotel Plaza Paris",
      city: "Paris",
      nights: 2,
      price: 450,
      rating: 4.5,
      amenities: ["WiFi", "Breakfast", "Gym", "Spa"],
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=200&fit=crop",
    },
    {
      name: "Grand Hotel Rome",
      city: "Rome",
      nights: 2,
      price: 380,
      rating: 4.3,
      amenities: ["WiFi", "Breakfast", "Pool", "Restaurant"],
      image:
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=300&h=200&fit=crop",
    },
  ];

  const getActivityIcon = (type) => {
    const icons = {
      travel: Plane,
      accommodation: Hotel,
      food: Utensils,
      activity: EventIcon,
    };
    const Icon = icons[type] || EventIcon;
    return <Icon className="w-4 h-4" />;
  };

  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: Sun,
      cloudy: Cloud,
      rainy: CloudRain,
    };
    const Icon = icons[condition] || Sun;
    return <Icon className="w-5 h-5" />;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Trip Header */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {trip.title}
            </h2>
            <p className="text-gray-600 mb-4">{trip.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{trip.duration} days</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{tripData?.people || 2} travelers</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>
                  {trip.rating} ({trip.reviews} reviews)
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">
              ${trip.price.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">per person</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {trip.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </Card>

      {/* Highlights */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What's Included
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trip.highlights.map((highlight, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">{highlight}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Destinations */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Destinations
        </h3>
        <div className="space-y-3">
          {trip.itinerary.map((city, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{city.name}</div>
                <div className="text-sm text-gray-600">{city.days} days</div>
              </div>
              {index < trip.itinerary.length - 1 && (
                <ArrowLeft className="w-4 h-4 text-gray-400 rotate-90" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderItinerary = () => (
    <div className="space-y-6">
      {mockItinerary.map((day) => (
        <Card key={day.day} className="p-6 bg-white border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full font-bold">
              Day {day.day}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{day.city}</h3>
              <p className="text-sm text-gray-600">{day.date}</p>
            </div>
          </div>

          <div className="space-y-3">
            {day.activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="text-sm font-medium text-gray-600 w-16">
                  {activity.time}
                </div>
                <div className="flex items-center gap-2">
                  {getActivityIcon(activity.type)}
                  <span className="text-gray-900">{activity.title}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  const renderBudget = () => (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Budget Breakdown
        </h3>
        <div className="space-y-4">
          {mockBudget.breakdown.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {item.category}
                    </span>
                    <span className="font-bold text-gray-900">
                      ${item.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-green-600">
              ${mockBudget.total.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderWeather = () => (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Weather Forecast
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockWeather.map((day, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900">{day.city}</div>
                  <div className="text-sm text-gray-600">{day.date}</div>
                </div>
                {getWeatherIcon(day.condition)}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {day.low}°C - {day.high}°C
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {day.condition}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderAccommodation = () => (
    <div className="space-y-6">
      {mockHotels.map((hotel, index) => (
        <Card key={index} className="p-6 bg-white border border-gray-200">
          <div className="flex gap-4">
            <img
              src={hotel.image}
              alt={hotel.name}
              className="w-24 h-24 object-cover rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{hotel.name}</h3>
                  <p className="text-sm text-gray-600">{hotel.city}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    ${hotel.price}/night
                  </div>
                  <div className="text-sm text-gray-600">
                    {hotel.nights} nights
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">{hotel.rating}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((amenity, amenityIndex) => (
                  <span
                    key={amenityIndex}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Included Activities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trip.highlights.map((activity, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-900">{activity}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Optional Add-ons
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Private City Tour</div>
              <div className="text-sm text-gray-600">Half-day guided tour</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">$150</div>
              <Button size="sm" variant="outline">
                Add
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Airport Transfer</div>
              <div className="text-sm text-gray-600">
                Private transfer to hotel
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">$80</div>
              <Button size="sm" variant="outline">
                Add
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "itinerary":
        return renderItinerary();
      case "budget":
        return renderBudget();
      case "weather":
        return renderWeather();
      case "accommodation":
        return renderAccommodation();
      case "activities":
        return renderActivities();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <TripPlanningSidebar
        currentStep="results"
        onStepClick={handleStepClick}
        tripData={tripData}
      />

      <div className="flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate("/plan/results")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Results
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                Book Now - ${trip.price.toLocaleString()}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailsPage;
