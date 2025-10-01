import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import { DollarSign, Plane, Home, Utensils, Calendar, ArrowRight } from "lucide-react";

const BudgetPage = () => {
  const navigate = useNavigate();
  const { tripData, updateTripData } = useTrip();
  
  const [budget, setBudget] = useState({
    total: tripData?.budget?.total || 5000,
    travel: tripData?.budget?.travel || 40,
    accommodation: tripData?.budget?.accommodation || 30,
    food: tripData?.budget?.food || 20,
    events: tripData?.budget?.events || 10,
  });

  const budgetCategories = [
    {
      id: "travel",
      name: "Travel",
      icon: Plane,
      color: "blue",
      description: "Flights, transportation, gas"
    },
    {
      id: "accommodation",
      name: "Accommodation",
      icon: Home,
      color: "green",
      description: "Hotels, hostels, rentals"
    },
    {
      id: "food",
      name: "Food & Dining",
      icon: Utensils,
      color: "orange",
      description: "Restaurants, groceries, drinks"
    },
    {
      id: "events",
      name: "Events & Activities",
      icon: Calendar,
      color: "purple",
      description: "Tours, tickets, experiences"
    }
  ];

  const updateBudget = (category, value) => {
    const newBudget = { ...budget, [category]: value };
    setBudget(newBudget);
    updateTripData({ budget: newBudget });
  };

  const calculateAmount = (percentage) => {
    return Math.round((budget.total * percentage) / 100);
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        accent: "text-blue-600",
        ring: "ring-blue-500"
      },
      green: {
        bg: "bg-green-50",
        text: "text-green-700",
        accent: "text-green-600",
        ring: "ring-green-500"
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        accent: "text-orange-600",
        ring: "ring-orange-500"
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        accent: "text-purple-600",
        ring: "ring-purple-500"
      }
    };
    return colors[color] || colors.blue;
  };

  const handleNext = () => {
    navigate('/plan/preferences');
  };

  const handleStepClick = (step) => {
    switch (step) {
      case "destinations":
        navigate('/plan');
        break;
      case "preferences":
        navigate('/plan/preferences');
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
        currentStep="budget" 
        onStepClick={handleStepClick}
        tripData={tripData}
      />
      
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Set Your Budget</h1>
                <p className="text-gray-600 mt-1">
                  Allocate your budget across different categories
                </p>
              </div>
            </div>
          </div>

          {/* Total Budget Section */}
          <Card className="p-6 mb-8 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Total Budget</h3>
              <div className="text-2xl font-bold text-green-600">
                ${budget.total.toLocaleString()}
              </div>
            </div>
            <Slider
              value={budget.total}
              onChange={(value) => updateBudget("total", value)}
              min={1000}
              max={50000}
              step={500}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>$1,000</span>
              <span>$50,000</span>
            </div>
          </Card>

          {/* Budget Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {budgetCategories.map((category) => {
              const Icon = category.icon;
              const colors = getColorClasses(category.color);
              const amount = calculateAmount(budget[category.id]);

              return (
                <Card key={category.id} className={`p-6 bg-white border border-gray-200 hover:shadow-lg transition-all duration-300 ${colors.bg}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-white ${colors.bg}`}>
                        <Icon className={`w-5 h-5 ${colors.accent}`} />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${colors.text}`}>
                          {category.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${colors.accent}`}>
                        {budget[category.id]}%
                      </div>
                      <div className="text-sm text-gray-600">
                        ${amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <Slider
                    value={budget[category.id]}
                    onChange={(value) => updateBudget(category.id, value)}
                    min={0}
                    max={100}
                    step={5}
                    className="mb-2"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Budget Summary */}
          <Card className="p-6 mb-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Allocation Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {budgetCategories.map((category) => {
                const amount = calculateAmount(budget[category.id]);
                const colors = getColorClasses(category.color);
                return (
                  <div key={category.id} className="text-center">
                    <div className={`text-2xl font-bold ${colors.accent} mb-1`}>
                      ${amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">{category.name}</div>
                    <div className="text-xs text-gray-500">{budget[category.id]}%</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/plan')}
              className="px-8 py-3"
            >
              Back to Destinations
            </Button>
            <Button
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
            >
              Continue to Preferences
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
