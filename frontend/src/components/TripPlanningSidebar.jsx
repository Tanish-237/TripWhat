import React from "react";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "destinations",
    title: "Destinations",
    icon: MapPin,
    description: "Select your destinations",
  },
  {
    id: "preferences", 
    title: "Preferences",
    icon: Users,
    description: "Travel style and group size",
  },
  {
    id: "budget",
    title: "Budget", 
    icon: DollarSign,
    description: "Set your budget",
  },
  {
    id: "results",
    title: "Results",
    icon: Sparkles,
    description: "Choose your trip",
  },
];

const TripPlanningSidebar = ({ currentStep, onStepClick, tripData }) => {
  
  const isBudgetValid = (budget) => {
    if (!budget || !budget.total || budget.total <= 0) return false;
    const categories = ['travel', 'accommodation', 'food', 'events'];
    const hasValidAllocations = categories.every(cat => 
      budget[cat] !== undefined && budget[cat] >= 0
    );
    if (!hasValidAllocations) return false;
    const totalAllocations = categories.reduce((sum, cat) => sum + (budget[cat] || 0), 0);
    const looksLikePercentages = categories.every(cat => budget[cat] <= 100) && 
                                budget.total > totalAllocations;
    if (looksLikePercentages) {
      return Math.abs(totalAllocations - 100) < 1;
    }
    return totalAllocations > 0;
  };

  const getStepStatus = (stepId) => {
    if (currentStep === stepId) return "current";
    switch (stepId) {
      case "destinations":
        return tripData?.cities?.length > 0 && tripData?.startDate ? "completed" : "pending";
      case "budget":
        return isBudgetValid(tripData?.budget) ? "completed" : "pending";
      case "preferences":
        return tripData?.people && tripData?.travelType ? "completed" : "pending";
      case "results":
        return tripData?.selectedTrip ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  const isStepAccessible = (stepId) => {
    switch (stepId) {
      case "destinations":
        return true;
      case "preferences":
        return tripData?.cities?.length > 0 && tripData?.startDate;
      case "budget":
        return tripData?.cities?.length > 0 && tripData?.startDate && tripData?.people && tripData?.travelType;
      case "results":
        return tripData?.cities?.length > 0 && tripData?.startDate && 
               tripData?.people && tripData?.travelType && isBudgetValid(tripData?.budget);
      default:
        return false;
    }
  };

  const getStepIcon = (step, status) => {
    const Icon = step.icon;
    if (status === "completed") {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
      <div className="sticky top-4 p-5 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Plan Your Trip</h2>
          <p className="text-xs text-gray-600">
            Follow these steps to create your perfect itinerary
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            const isClickable = isStepAccessible(step.id);
            const isBlocked = !isClickable && status !== "completed";

            return (
              <Card
                key={step.id}
                className={cn(
                  "p-3 transition-all duration-200 cursor-pointer",
                  status === "current" && "ring-2 ring-blue-500 bg-blue-50",
                  status === "completed" && "bg-green-50 hover:bg-green-100",
                  status === "pending" && !isBlocked && "bg-gray-50 hover:bg-gray-100",
                  isBlocked && "bg-red-50 border-red-200 cursor-not-allowed opacity-60"
                )}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full",
                    status === "current" && "bg-blue-100",
                    status === "completed" && "bg-green-100",
                    status === "pending" && "bg-gray-100"
                  )}>
                    {getStepIcon(step, status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-medium text-sm",
                      status === "current" && "text-blue-900",
                      status === "completed" && "text-green-900",
                      status === "pending" && "text-gray-700"
                    )}>
                      {step.title}
                    </h3>
                    <p className={cn(
                      "text-xs mt-0.5",
                      status === "current" && "text-blue-600",
                      status === "completed" && "text-green-600",
                      status === "pending" && "text-gray-500"
                    )}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {tripData && (tripData.cities?.length > 0 || tripData.startDate || (tripData.people && tripData.people > 0) || (tripData.budget && tripData.budget.total > 0) || tripData.selectedTrip) ? (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-blue-900">Trip Summary</h3>
              </div>
              
              <div className="space-y-2 text-xs">
                {tripData?.cities?.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Destinations:
                      </span>
                      <span className="font-medium text-blue-900">
                        {tripData.cities.length} cities
                      </span>
                    </div>
                    <div className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                      {tripData.cities.map(city => city.name).join(' → ')}
                    </div>
                  </>
                )}

                {tripData?.startDate && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-700">Start Date:</span>
                      <span className="font-medium text-blue-900">
                        {new Date(tripData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {tripData.totalDays && (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">Duration:</span>
                        <span className="font-medium text-blue-900">
                          {tripData.totalDays} days
                        </span>
                      </div>
                    )}
                    {tripData.totalDays && tripData.startDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">End Date:</span>
                        <span className="font-medium text-blue-900">
                          {new Date(new Date(tripData.startDate).getTime() + (tripData.totalDays - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {tripData?.people > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Travelers:
                    </span>
                    <span className="font-medium text-blue-900">
                      {tripData.people} {tripData.people === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                )}

                {tripData?.travelType && (
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700">Travel Style:</span>
                    <span className="font-medium text-blue-900 capitalize bg-blue-100 px-2 py-0.5 rounded">
                      {tripData.travelType.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                )}

                {tripData?.budget && tripData.budget.total > 0 && (
                  <>
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-blue-700 flex items-center gap-1 font-medium">
                          <DollarSign className="w-3 h-3" />
                          Total Budget:
                        </span>
                        <span className="font-bold text-blue-900">
                          ${tripData.budget.total.toLocaleString()}
                        </span>
                      </div>
                      {tripData.budgetMode && (
                        <div className="text-xs text-blue-600 mb-2">
                          Mode: {tripData.budgetMode === 'capped' ? 'Fixed Budget' : 'Flexible Budget'}
                        </div>
                      )}
                      {tripData.budget.travel > 0 && (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-blue-600">✈️ Travel:</span>
                            <span className="text-blue-800">${(tripData.budgetMode === 'capped' ? Math.round(tripData.budget.total * tripData.budget.travel / 100) : tripData.budget.travel).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">🏨 Hotels:</span>
                            <span className="text-blue-800">${(tripData.budgetMode === 'capped' ? Math.round(tripData.budget.total * tripData.budget.accommodation / 100) : tripData.budget.accommodation).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">🍽️ Food:</span>
                            <span className="text-blue-800">${(tripData.budgetMode === 'capped' ? Math.round(tripData.budget.total * tripData.budget.food / 100) : tripData.budget.food).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">🎉 Activities:</span>
                            <span className="text-blue-800">${(tripData.budgetMode === 'capped' ? Math.round(tripData.budget.total * tripData.budget.events / 100) : tripData.budget.events).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-gray-50 border-gray-200">
            <div className="p-4 text-center">
              <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="font-medium text-sm text-gray-700 mb-1">Getting Started</h3>
              <p className="text-xs text-gray-500">Add destinations to see your trip summary</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TripPlanningSidebar;
