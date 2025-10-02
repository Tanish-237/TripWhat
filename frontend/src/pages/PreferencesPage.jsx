import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import { 
  Users, 
  Briefcase, 
  Heart, 
  Camera, 
  Mountain, 
  Plane, 
  ArrowRight, 
  ArrowLeft,
  Check
} from "lucide-react";

const PreferencesPage = () => {
  const navigate = useNavigate();
  const { tripData, updateTripData } = useTrip();
  
  const [people, setPeople] = useState(tripData?.people || 1);
  const [travelType, setTravelType] = useState(tripData?.travelType || "");

  // Update local state when tripData changes
  React.useEffect(() => {
    if (tripData?.people) {
      setPeople(tripData.people);
    }
    if (tripData?.travelType) {
      setTravelType(tripData.travelType);
    }
  }, [tripData?.people, tripData?.travelType]);

  const travelTypes = [
    {
      id: "leisure",
      name: "Leisure",
      icon: Heart,
      description: "Relaxing vacation, sightseeing, entertainment",
      color: "pink"
    },
    {
      id: "business",
      name: "Business",
      icon: Briefcase,
      description: "Work meetings, conferences, professional",
      color: "blue"
    },
    {
      id: "adventure",
      name: "Adventure",
      icon: Mountain,
      description: "Outdoor activities, hiking, extreme sports",
      color: "green"
    },
    {
      id: "cultural",
      name: "Cultural",
      icon: Camera,
      description: "Museums, historical sites, local experiences",
      color: "purple"
    },
    {
      id: "family",
      name: "Family",
      icon: Users,
      description: "Kid-friendly activities, family bonding",
      color: "orange"
    },
    {
      id: "solo",
      name: "Solo Travel",
      icon: Plane,
      description: "Independent exploration, self-discovery",
      color: "indigo"
    }
  ];

  const handleNext = () => {
    updateTripData({ people, travelType });
    navigate('/plan/results');
  };

  const getColorClasses = (color) => {
    const colors = {
      pink: {
        bg: "bg-pink-50",
        border: "border-pink-200",
        text: "text-pink-700",
        accent: "text-pink-600",
        ring: "ring-pink-500",
        selected: "bg-pink-100 border-pink-300"
      },
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        accent: "text-blue-600",
        ring: "ring-blue-500",
        selected: "bg-blue-100 border-blue-300"
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        accent: "text-green-600",
        ring: "ring-green-500",
        selected: "bg-green-100 border-green-300"
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        accent: "text-purple-600",
        ring: "ring-purple-500",
        selected: "bg-purple-100 border-purple-300"
      },
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        accent: "text-orange-600",
        ring: "ring-orange-500",
        selected: "bg-orange-100 border-orange-300"
      },
      indigo: {
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
        accent: "text-indigo-600",
        ring: "ring-indigo-500",
        selected: "bg-indigo-100 border-indigo-300"
      }
    };
    return colors[color] || colors.blue;
  };

  const handlePeopleChange = (newPeople) => {
    setPeople(newPeople);
    updateTripData({ people: newPeople });
  };

  const handleTravelTypeChange = (type) => {
    setTravelType(type);
    updateTripData({ travelType: type });
  };

  const handleStepClick = (step) => {
    switch (step) {
      case "destinations":
        navigate('/plan');
        break;
      case "budget":
        if (tripData?.cities?.length > 0 && tripData?.startDate) {
          navigate('/plan/budget');
        }
        break;
      case "preferences":
        // Already on preferences page
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

  const isComplete = people > 0 && travelType;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <TripPlanningSidebar 
        currentStep="preferences" 
        onStepClick={handleStepClick}
        tripData={tripData}
      />
      
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Travel Preferences</h1>
                <p className="text-gray-600 mt-1">
                  Tell us about your travel style and group size
                </p>
              </div>
            </div>
          </div>

          {/* Number of People */}
          <Card className="p-6 mb-8 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Number of Travelers</h3>
                <p className="text-gray-600">How many people are traveling?</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePeopleChange(Math.max(1, people - 1))}
                disabled={people <= 1}
                className="h-12 w-12"
              >
                -
              </Button>
              
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={people}
                  onChange={(e) => handlePeopleChange(Math.max(1, Number(e.target.value)))}
                  className="text-center text-2xl font-bold h-12"
                />
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePeopleChange(Math.min(20, people + 1))}
                disabled={people >= 20}
                className="h-12 w-12"
              >
                +
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              {people === 1 ? "Solo traveler" : `${people} people traveling together`}
            </p>
          </Card>

          {/* Travel Type */}
          <Card className="p-6 mb-8 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Travel Type</h3>
                <p className="text-gray-600">What kind of experience are you looking for?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {travelTypes.map((type) => {
                const Icon = type.icon;
                const colors = getColorClasses(type.color);
                const isSelected = travelType === type.id;

                return (
                  <Card
                    key={type.id}
                    className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? `${colors.selected} ring-2 ${colors.ring}` 
                        : `${colors.bg} ${colors.border} hover:shadow-lg`
                    }`}
                    onClick={() => handleTravelTypeChange(type.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-5 h-5 ${colors.accent}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${colors.text} mb-1`}>
                          {type.name}
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {type.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className={`p-1 rounded-full ${colors.bg}`}>
                          <Check className={`w-4 h-4 ${colors.accent}`} />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {/* Summary */}
          {isComplete && (
            <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Travelers</div>
                    <div className="font-semibold text-gray-900">
                      {people} {people === 1 ? "person" : "people"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="text-sm text-gray-600">Travel Type</div>
                    <div className="font-semibold text-gray-900">
                      {travelTypes.find(t => t.id === travelType)?.name}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/plan/budget')}
              className="px-8 py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Budget
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isComplete}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
            >
              Continue to Results
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
