import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import Navbar from "@/components/Navbar";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import StartLocationPicker from "@/components/StartLocationPicker";
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

// Custom styles for date picker
const datePickerStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator {
    opacity: 0;
    width: 100%;
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
    cursor: pointer;
  }
  
  input[type="date"]::-webkit-inner-spin-button,
  input[type="date"]::-webkit-clear-button {
    display: none;
  }
  
  input[type="date"]::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
  }
  
  input[type="date"]::-webkit-datetime-edit-text {
    color: #6B7280;
    padding: 0 2px;
  }
  
  input[type="date"]::-webkit-datetime-edit-month-field,
  input[type="date"]::-webkit-datetime-edit-day-field,
  input[type="date"]::-webkit-datetime-edit-year-field {
    color: #111827;
  }
`;

const DatePicker = ({ selected, onSelect }) => {
  const today = new Date();
  const [isOpen, setIsOpen] = useState(false);

  const handleDateClick = () => {
    setIsOpen(true);
  };

  const handleDateChange = (e) => {
    if (e.target.value) {
      onSelect(new Date(e.target.value));
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <style>{datePickerStyles}</style>
      <div className="relative cursor-pointer" onClick={handleDateClick}>
        <div className="w-full h-12 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 text-base focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 flex items-center justify-between">
          <span className={selected ? "text-gray-900" : "text-gray-500"}>
            {selected
              ? format(selected, "MMMM do, yyyy")
              : "Select departure date"}
          </span>
          <CalendarIcon className="h-5 w-5 text-blue-500" />
        </div>
        <input
          type="date"
          value={selected ? format(selected, "yyyy-MM-dd") : ""}
          min={format(today, "yyyy-MM-dd")}
          onChange={handleDateChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{
            colorScheme: "light",
          }}
        />
      </div>
    </div>
  );
};

// Dashboard components start here
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

const CityCard = ({ city, index, onRemove, onUpdate, isGoogleMapsLoaded }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(city.name);
  const [editPlace, setEditPlace] = useState(null);
  const [editDays, setEditDays] = useState(city.days.toString());

  const handleSave = () => {
    const cityName = editPlace?.label || editName.trim();
    if (cityName) {
      onUpdate(city.id, {
        name: cityName,
        days: Number.parseInt(editDays) || 1,
      });
      setIsEditing(false);
      setEditPlace(null);
    }
  };

  const handleCancel = () => {
    setEditName(city.name);
    setEditDays(city.days.toString());
    setEditPlace(null);
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
            {isGoogleMapsLoaded ? (
              <div className="flex-1">
                <GooglePlacesAutocomplete
                  selectProps={{
                    value: editPlace,
                    onChange: setEditPlace,
                    placeholder: city.name,
                    isClearable: true,
                    styles: {
                      control: (provided) => ({
                        ...provided,
                        height: '40px',
                        minHeight: '40px',
                        borderRadius: '0.5rem',
                        borderWidth: '1px',
                        borderColor: '#E5E7EB',
                        backgroundColor: 'white',
                        fontSize: '0.875rem',
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                    },
                  }}
                  autocompletionRequest={{
                    types: ['(cities)'],
                  }}
                />
              </div>
            ) : (
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
            )}
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
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  console.log('🚀 [TripBuilder] Component rendering');
  console.log('🔑 [TripBuilder] API Key from env:', googleMapsApiKey ? `${googleMapsApiKey.substring(0, 20)}...` : 'MISSING!');
  
  const isGoogleMapsLoaded = useGoogleMaps(googleMapsApiKey);
  
  console.log('📊 [TripBuilder] isGoogleMapsLoaded:', isGoogleMapsLoaded);
  
  const [startDate, setStartDate] = useState(
    tripData?.startDate ? new Date(tripData.startDate) : null
  );
  const [startLocation, setStartLocation] = useState(tripData?.startLocation || null);
  const [cities, setCities] = useState(tripData?.cities || []);
  const [newCityName, setNewCityName] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [newCityDays, setNewCityDays] = useState("3");
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Log when Google Maps load state changes
  React.useEffect(() => {
    console.log('🔄 [TripBuilder] Google Maps loaded state changed:', isGoogleMapsLoaded);
  }, [isGoogleMapsLoaded]);

  // Update local state when tripData changes
  React.useEffect(() => {
    if (tripData?.startDate) {
      setStartDate(new Date(tripData.startDate));
    }
    if (tripData?.startLocation) {
      setStartLocation(tripData.startLocation);
    }
    if (tripData?.cities) {
      setCities(tripData.cities);
    }
  }, [tripData]);

  // Persist data changes to context
  const persistData = (newStartDate = startDate, newStartLocation = startLocation, newCities = cities) => {
    const totalDays = newCities.reduce((sum, city) => sum + city.days, 0);
    updateTripData({
      startDate: newStartDate,
      startLocation: newStartLocation,
      cities: newCities,
      totalDays,
    });
  };

  const handleDateChange = (date) => {
    setStartDate(date);
    persistData(date, startLocation, cities);
  };

  const handleStartLocationChange = (location) => {
    setStartLocation(location);
    persistData(startDate, location, cities);
  };

  const addCity = () => {
    const cityName = selectedPlace?.label || newCityName.trim();
    if (cityName && newCityDays) {
      const newCity = {
        id: Date.now().toString(),
        name: cityName,
        days: Number.parseInt(newCityDays) || 1,
      };
      const newCities = [...cities, newCity];
      setCities(newCities);
      persistData(startDate, startLocation, newCities);
      setNewCityName("");
      setSelectedPlace(null);
      setNewCityDays("3");
      setShowAddForm(false);
    }
  };

  const removeCity = (id) => {
    const newCities = cities.filter((city) => city.id !== id);
    setCities(newCities);
    persistData(startDate, startLocation, newCities);
  };

  const updateCity = (id, updates) => {
    const newCities = cities.map((city) =>
      city.id === id ? { ...city, ...updates } : city
    );
    setCities(newCities);
    persistData(startDate, startLocation, newCities);
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
    persistData(startDate, startLocation, newCities);
    setDraggedIndex(null);
  };

  const totalDays = cities.reduce((sum, city) => sum + city.days, 0);

  const generateItinerary = () => {
    if (startDate && cities.length > 0) {
      const tripData = {
        startDate,
        startLocation,
        cities,
        totalDays: cities.reduce((sum, city) => sum + city.days, 0),
      };
      console.log("Starting planning with data:", tripData);
      onStartPlanning(tripData);
    } else {
      console.log("Cannot proceed: missing startDate or cities", {
        startDate,
        startLocation,
        cities,
      });
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
            {/* Date and Start Location Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Picker */}
              <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-white/90 hover:backdrop-blur-sm transition-all duration-300">
                <div className="space-y-3">
                  <label className="text-base font-semibold flex items-center gap-2 text-gray-800">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    When does your journey begin?
                  </label>
                  <div className="relative z-30">
                    <DatePicker
                      selected={startDate}
                      onSelect={handleDateChange}
                    />
                  </div>
                </div>
              </Card>

              {/* Start Location Picker */}
              <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-white/90 hover:backdrop-blur-sm transition-all duration-300">
                <div className="space-y-3">
                  <label className="text-base font-semibold flex items-center gap-2 text-gray-800">
                    <MapPin className="w-4 h-4 text-green-500" />
                    Where are you starting from?
                  </label>
                  <div className="relative z-20">
                    <StartLocationPicker
                      selected={startLocation}
                      onSelect={handleStartLocationChange}
                      isGoogleMapsLoaded={isGoogleMapsLoaded}
                    />
                  </div>
                </div>
              </Card>
            </div>

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
                      isGoogleMapsLoaded={isGoogleMapsLoaded}
                    />
                  </div>
                ))}

                {showAddForm && (
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-pink-50 border-2 border-dashed border-blue-200 hover:bg-gradient-to-r hover:from-blue-100/80 hover:to-pink-100/80 hover:backdrop-blur-sm transition-all duration-300">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="flex-1">
                        {(() => {
                          console.log('🎨 [TripBuilder] Rendering autocomplete, isGoogleMapsLoaded:', isGoogleMapsLoaded);
                          return isGoogleMapsLoaded ? (
                          <GooglePlacesAutocomplete
                            selectProps={{
                              value: selectedPlace,
                              onChange: setSelectedPlace,
                              placeholder: "Search for a city or destination...",
                              isClearable: true,
                              styles: {
                                control: (provided) => ({
                                  ...provided,
                                  height: '48px',
                                  minHeight: '48px',
                                  borderRadius: '0.5rem',
                                  borderWidth: '1px',
                                  borderColor: '#E5E7EB',
                                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                  backdropFilter: 'blur(4px)',
                                  fontSize: '1rem',
                                  '&:hover': {
                                    borderColor: '#93C5FD',
                                  },
                                  '&:focus-within': {
                                    backgroundColor: 'white',
                                    borderColor: '#3B82F6',
                                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
                                  },
                                }),
                                input: (provided) => ({
                                  ...provided,
                                  color: '#111827',
                                }),
                                placeholder: (provided) => ({
                                  ...provided,
                                  color: '#6B7280',
                                }),
                                singleValue: (provided) => ({
                                  ...provided,
                                  color: '#111827',
                                }),
                                menu: (provided) => ({
                                  ...provided,
                                  borderRadius: '0.5rem',
                                  overflow: 'hidden',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                  zIndex: 9999,
                                }),
                                option: (provided, state) => ({
                                  ...provided,
                                  backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#DBEAFE' : 'white',
                                  color: state.isSelected ? 'white' : '#111827',
                                  cursor: 'pointer',
                                  '&:active': {
                                    backgroundColor: '#2563EB',
                                  },
                                }),
                              },
                            }}
                            autocompletionRequest={{
                              types: ['(cities)'],
                            }}
                          />
                        ) : (
                          <Input
                            placeholder="City name (e.g., Paris, Tokyo)"
                            value={newCityName}
                            onChange={(e) => setNewCityName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addCity()}
                            className="h-12 text-base bg-white/80 backdrop-blur-sm border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white transition-all duration-200"
                            autoFocus
                          />
                        );
                        })()}
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
                          disabled={!selectedPlace && !newCityName.trim()}
                        >
                          <Check className="h-5 w-5" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddForm(false);
                            setNewCityName("");
                            setSelectedPlace(null);
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
                        {startLocation && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-green-50">
                            <span className="text-sm font-medium text-gray-600 block">
                              Starting From
                            </span>
                            <span className="text-sm font-bold text-purple-600">
                              {startLocation.name}
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
    navigate("/plan/preferences");
  };

  const handleStepClick = (step) => {
    switch (step) {
      case "destinations":
        // Already on destinations page
        break;
      case "budget":
        if (tripData?.cities?.length > 0 && tripData?.startDate) {
          navigate("/plan/budget");
        }
        break;
      case "preferences":
        if (tripData?.budget?.total) {
          navigate("/plan/preferences");
        }
        break;
      case "results":
        if (tripData?.people && tripData?.travelType) {
          navigate("/plan/results");
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar showSearch={true} />
      <div className="flex">
        <TripPlanningSidebar
          currentStep="destinations"
          onStepClick={handleStepClick}
          tripData={tripData}
        />

        <div className="flex-1">
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
    </div>
  );
}
