import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import {
  Plus,
  CalendarIcon,
  MapPin,
  Plane,
  Sparkles,
  GripVertical,
  Clock,
  X,
  Edit2,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DatePicker = ({ selected, onSelect }) => {
  const today = new Date();

  return (
    <div className="relative">
      <input
        type="date"
        value={selected ? format(selected, "yyyy-MM-dd") : ""}
        min={format(today, "yyyy-MM-dd")}
        onChange={(e) => {
          if (e.target.value) {
            onSelect(new Date(e.target.value));
          }
        }}
        className="w-full p-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50 transition-colors cursor-pointer"
        placeholder="Select departure date"
      />
    </div>
  );
};

const DashboardNav = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-pink-500 shadow-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">TripWhat</span>
              <span className="text-[10px] text-gray-500 -mt-1">
                Plan Smarter
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search destinations, trips, experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-12 pr-4 text-base bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-full"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/90 hover:to-pink-500/90 hover:backdrop-blur-sm px-4 py-2 transition-all duration-300"
            >
              Explore
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-pink-500/90 hover:to-blue-500/90 hover:backdrop-blur-sm px-4 py-2 transition-all duration-300"
            >
              Trips
            </Button>
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/90 hover:to-pink-500/90 hover:backdrop-blur-sm px-4 py-2 transition-all duration-300"
            >
              Saved
            </Button>

            <div className="ml-4">
              <Button
                variant="ghost"
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">T</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const QuickStats = () => {
  const stats = [
    { label: "Upcoming Trips", value: "2", icon: CalendarIcon },
    { label: "Cities Visited", value: "12", icon: MapPin },
    { label: "Days Traveled", value: "45", icon: Plane },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="p-6 hover:shadow-xl hover:bg-white/80 hover:backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 cursor-pointer group bg-white border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300 bg-blue-100">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const CityCard = ({ city, index, onRemove, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(city.name);
  const [editDays, setEditDays] = useState(city.days.toString());

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(city.id, {
        name: editName.trim(),
        days: Number.parseInt(editDays) || 1,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(city.name);
    setEditDays(city.days.toString());
    setIsEditing(false);
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-xl hover:bg-white/90 hover:backdrop-blur-sm hover:-translate-y-1 bg-white border border-gray-200 hover:border-blue-300">
      <div className="relative flex items-center gap-4 p-5">
        <div className="flex cursor-grab items-center text-gray-400 hover:text-blue-500 active:cursor-grabbing">
          <GripVertical className="h-6 w-6" />
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold text-lg">
          <span>{index + 1}</span>
        </div>

        {isEditing ? (
          <div className="flex flex-1 gap-2 items-center">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-10 flex-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <Input
              type="number"
              min="1"
              max="30"
              value={editDays}
              onChange={(e) => setEditDays(e.target.value)}
              className="h-10 w-24 bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <Button
              size="sm"
              onClick={handleSave}
              className="h-10 gap-2 bg-blue-500 hover:bg-blue-600 text-white border-0"
            >
              <Check className="h-4 w-4" />
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold text-lg text-gray-900">
                  {city.name}
                </h4>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {city.days} {city.days === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-10 w-10 text-gray-500 hover:text-blue-500 hover:bg-blue-50"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemove(city.id)}
                className="h-10 w-10 text-gray-500 hover:text-red-500 hover:bg-red-50"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

const TripBuilder = ({ onStartPlanning, tripData, updateTripData }) => {
  const [startDate, setStartDate] = useState(tripData?.startDate ? new Date(tripData.startDate) : null);
  const [cities, setCities] = useState(tripData?.cities || []);
  const [newCityName, setNewCityName] = useState("");
  const [newCityDays, setNewCityDays] = useState("3");
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Update local state when tripData changes
  React.useEffect(() => {
    if (tripData?.startDate) {
      setStartDate(new Date(tripData.startDate));
    }
    if (tripData?.cities) {
      setCities(tripData.cities);
    }
  }, [tripData]);

  // Persist data changes to context
  const persistData = (newStartDate = startDate, newCities = cities) => {
    const totalDays = newCities.reduce((sum, city) => sum + city.days, 0);
    updateTripData({
      startDate: newStartDate,
      cities: newCities,
      totalDays
    });
  };

  const handleDateChange = (date) => {
    setStartDate(date);
    persistData(date, cities);
  };

  const addCity = () => {
    if (newCityName.trim() && newCityDays) {
      const newCity = {
        id: Date.now().toString(),
        name: newCityName.trim(),
        days: Number.parseInt(newCityDays) || 1,
      };
      const newCities = [...cities, newCity];
      setCities(newCities);
      persistData(startDate, newCities);
      setNewCityName("");
      setNewCityDays("3");
      setShowAddForm(false);
    }
  };

  const removeCity = (id) => {
    const newCities = cities.filter((city) => city.id !== id);
    setCities(newCities);
    persistData(startDate, newCities);
  };

  const updateCity = (id, updates) => {
    const newCities = cities.map((city) => (city.id === id ? { ...city, ...updates } : city));
    setCities(newCities);
    persistData(startDate, newCities);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newCities = [...cities];
    const draggedCity = newCities[draggedIndex];
    newCities.splice(draggedIndex, 1);
    newCities.splice(dropIndex, 0, draggedCity);

    setCities(newCities);
    persistData(startDate, newCities);
    setDraggedIndex(null);
  };

  const totalDays = cities.reduce((sum, city) => sum + city.days, 0);

  const generateItinerary = () => {
    if (startDate && cities.length > 0) {
      const tripData = {
        startDate,
        cities,
        totalDays: cities.reduce((sum, city) => sum + city.days, 0)
      };
      console.log("Starting planning with data:", tripData);
      onStartPlanning(tripData);
    } else {
      console.log("Cannot proceed: missing startDate or cities", { startDate, cities });
    }
  };

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-left">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-pink-500 shadow-lg">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-gray-900">
              Plan Your Trip
            </h2>
          </div>
          <p className="text-gray-600 text-lg">
            Add destinations and build your perfect itinerary
          </p>
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Destinations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date Picker Section - Now in left column */}
            <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-white/90 hover:backdrop-blur-sm transition-all duration-300">
              <div className="space-y-3">
                <label className="text-base font-semibold flex items-center gap-2 text-gray-800">
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  When does your journey begin?
                </label>
                <div className="relative z-30">
                  <DatePicker selected={startDate} onSelect={handleDateChange} />
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <label className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                <MapPin className="w-5 h-5 text-pink-500" />
                Your Destinations
              </label>

              <div className="space-y-3">
                {cities.map((city, index) => (
                  <div
                    key={city.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="cursor-move"
                  >
                    <CityCard
                      city={city}
                      index={index}
                      onRemove={removeCity}
                      onUpdate={updateCity}
                    />
                  </div>
                ))}

                {showAddForm && (
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-pink-50 border-2 border-dashed border-blue-200 hover:bg-gradient-to-r hover:from-blue-100/80 hover:to-pink-100/80 hover:backdrop-blur-sm transition-all duration-300">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="flex-1">
                        <Input
                          placeholder="City name (e.g., Paris, Tokyo)"
                          value={newCityName}
                          onChange={(e) => setNewCityName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCity()}
                          className="h-12 text-base bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white transition-all duration-200"
                          autoFocus
                        />
                      </div>
                      <div className="w-full sm:w-36">
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          placeholder="Days"
                          value={newCityDays}
                          onChange={(e) => setNewCityDays(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCity()}
                          className="h-12 text-base bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white transition-all duration-200"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={addCity}
                          className="h-12 gap-2 px-6 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white border-0 transition-all duration-300"
                          disabled={!newCityName.trim()}
                        >
                          <Check className="h-5 w-5" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddForm(false);
                            setNewCityName("");
                            setNewCityDays("3");
                          }}
                          className="h-12 px-4 border-gray-300 text-gray-600 hover:bg-white/80 hover:backdrop-blur-sm transition-all duration-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {!showAddForm && (
                  <div className="flex flex-col items-center gap-4">
                    {cities.length === 0 && (
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-medium text-gray-700">
                          No destinations yet
                        </h3>
                        <p className="text-sm text-gray-500">
                          Start building your dream trip by adding your first
                          destination
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={() => setShowAddForm(true)}
                      variant="outline"
                      className="h-14 w-14 rounded-full border-2 border-dashed border-blue-300 text-blue-500 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-pink-50/80 hover:backdrop-blur-sm hover:border-blue-400 transition-all duration-300"
                    >
                      <Plus className="h-7 w-7" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Itinerary Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {cities.length > 0 ? (
                <>
                  <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:shadow-lg hover:bg-gradient-to-br hover:from-white/90 hover:to-gray-50/90 hover:backdrop-blur-sm transition-all duration-300">
                    <div className="p-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-4">
                        <Sparkles className="w-5 h-5 text-pink-500" />
                        Trip Summary
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-pink-50">
                          <span className="text-sm font-medium text-gray-600">
                            Total Cities
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {cities.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-pink-50 to-blue-50">
                          <span className="text-sm font-medium text-gray-600">
                            Total Days
                          </span>
                          <span className="text-lg font-bold text-pink-600">
                            {totalDays}
                          </span>
                        </div>
                        {startDate && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
                            <span className="text-sm font-medium text-gray-600 block">
                              Start Date
                            </span>
                            <span className="text-sm font-bold text-green-600">
                              {format(startDate, "MMMM do, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Button
                    onClick={generateItinerary}
                    className="w-full gap-3 h-14 px-6 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 hover:shadow-lg text-white border-0 font-semibold transition-all duration-300 text-lg"
                    disabled={!startDate || cities.length === 0}
                  >
                    <Plane className="h-5 w-5" />
                    <span>Continue to Preferences</span>
                  </Button>
                </>
              ) : (
                <Card className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:bg-gradient-to-br hover:from-gray-50/90 hover:to-white/90 hover:backdrop-blur-sm transition-all duration-300">
                  <div className="p-8 text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-100 to-pink-100">
                      <Sparkles className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Trip Summary
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Add destinations to see your trip summary here.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const { tripData, updateTripData } = useTrip();

  const handleStartPlanning = (data) => {
    updateTripData(data);
    navigate('/plan/preferences');
  };

  const handleStepClick = (step) => {
    switch (step) {
      case "destinations":
        // Already on destinations page
        break;
      case "budget":
        if (tripData?.cities?.length > 0 && tripData?.startDate) {
          navigate('/plan/budget');
        }
        break;
      case "preferences":
        if (tripData?.budget?.total) {
          navigate('/plan/preferences');
        }
        break;
      case "results":
        if (tripData?.people && tripData?.travelType) {
          navigate('/plan/results');
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <TripPlanningSidebar 
        currentStep="destinations" 
        onStepClick={handleStepClick}
        tripData={tripData}
      />
      
      <div className="flex-1">
        <DashboardNav />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <QuickStats />
          <TripBuilder 
            onStartPlanning={handleStartPlanning} 
            tripData={tripData}
            updateTripData={updateTripData}
          />
        </main>
      </div>
    </div>
  );
}
