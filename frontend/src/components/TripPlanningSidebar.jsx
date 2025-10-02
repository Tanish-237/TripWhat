import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  DollarSign,
  Users,
  Sparkles,
  CheckCircle,
  Circle,
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
  
  // Helper function to validate budget completion
  const isBudgetValid = (budget) => {
    if (!budget || !budget.total || budget.total <= 0) return false;
    
    // Check if all categories have valid allocations
    const categories = ['travel', 'accommodation', 'food', 'events'];
    const hasValidAllocations = categories.every(cat => 
      budget[cat] !== undefined && budget[cat] >= 0
    );
    
    if (!hasValidAllocations) return false;
    
    // For percentage-based budget (capped mode), check if total equals 100%
    const totalAllocations = categories.reduce((sum, cat) => sum + (budget[cat] || 0), 0);
    
    // If values look like percentages (all ≤ 100 and budget.total > totalAllocations), 
    // then validate they sum to 100%
    const looksLikePercentages = categories.every(cat => budget[cat] <= 100) && 
                                budget.total > totalAllocations;
    
    if (looksLikePercentages) {
      return Math.abs(totalAllocations - 100) < 1; // Allow small rounding errors
    }
    
    // For dollar-based budget (flexible mode), just ensure all categories have some allocation
    return totalAllocations > 0;
  };

  const getStepStatus = (stepId) => {
    if (currentStep === stepId) return "current";
    
    // Check if step is completed based on trip data
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
        return true; // Always accessible
      case "preferences":
        // Can only access preferences after destinations are completed
        return tripData?.cities?.length > 0 && tripData?.startDate;
      case "budget":
        // Can only access budget after preferences are completed
        return tripData?.cities?.length > 0 && tripData?.startDate && tripData?.people && tripData?.travelType;
      case "results":
        // Can only access results after budget is properly completed with valid allocations
        return tripData?.cities?.length > 0 && tripData?.startDate && 
               tripData?.people && tripData?.travelType && isBudgetValid(tripData?.budget);
      default:
        return false;
    }
  };

  const getStepIcon = (step, status) => {
    const Icon = step.icon;
    if (status === "completed") {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Plan Your Trip</h2>
        <p className="text-sm text-gray-600">
          Follow these steps to create your perfect itinerary
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = isStepAccessible(step.id);
          const isBlocked = !isClickable && status !== "completed";

          return (
            <Card
              key={step.id}
              className={cn(
                "p-4 transition-all duration-200",
                status === "current" && "ring-2 ring-blue-500 bg-blue-50",
                status === "completed" && "bg-green-50 hover:bg-green-100",
                status === "pending" && !isBlocked && "bg-gray-50",
                isBlocked && "bg-red-50 border-red-200",
                isClickable ? "cursor-pointer hover:shadow-md" : "cursor-not-allowed opacity-60"
              )}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  status === "current" && "bg-blue-100",
                  status === "completed" && "bg-green-100",
                  status === "pending" && "bg-gray-100"
                )}>
                  {getStepIcon(step, status)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-semibold text-sm",
                    status === "current" && "text-blue-900",
                    status === "completed" && "text-green-900",
                    status === "pending" && "text-gray-700"
                  )}>
                    {step.title}
                  </h3>
                  <p className={cn(
                    "text-xs mt-1",
                    status === "current" && "text-blue-700",
                    status === "completed" && "text-green-700",
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

      {/* Trip Summary - Enhanced styling */}
      {tripData && (
        <div className="mt-8 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
          <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Trip Summary
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            {/* Always show destinations info if available */}
            {tripData.cities && tripData.cities.length > 0 && (
              <>
                <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
                  <span className="font-medium text-gray-600">🌍 Destinations:</span>
                  <span className="font-bold text-blue-600">{tripData.cities.length} cities</span>
                </div>
                <div className="text-xs text-gray-600 bg-white p-2 rounded-lg shadow-sm">
                  {tripData.cities.map(city => `${city.name} (${city.days}d)`).join(' → ')}
                </div>
              </>
            )}
            {tripData.startDate && (
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
                <span className="font-medium text-gray-600">📅 Start Date:</span>
                <span className="font-bold text-green-600">
                  {new Date(tripData.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {tripData.totalDays && (
              <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
                <span className="font-medium text-gray-600">⏱️ Duration:</span>
                <span className="font-bold text-purple-600">{tripData.totalDays} days</span>
              </div>
            )}

            {/* Show preferences info only if we're past destinations step */}
            {(currentStep === "preferences" || currentStep === "budget" || currentStep === "results") && (
              <>
                {tripData.people && (
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
                    <span className="font-medium text-gray-600">👥 Group Size:</span>
                    <span className="font-bold text-indigo-600">{tripData.people} people</span>
                  </div>
                )}
                {tripData.travelType && (
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
                    <span className="font-medium text-gray-600">🎯 Travel Style:</span>
                    <span className="font-bold text-pink-600 capitalize">{tripData.travelType}</span>
                  </div>
                )}
              </>
            )}

            {/* Show budget info only if we're past preferences step */}
            {(currentStep === "budget" || currentStep === "results") && tripData.budget && (
              <>
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Total Budget:</span>
                    <span className="font-bold text-green-600 text-lg">
                      ${tripData.budget.total?.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Budget breakdown with enhanced styling */}
                  {(tripData.budget.travel || tripData.budget.accommodation || tripData.budget.food || tripData.budget.events) && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-gray-600 mb-2">Budget Breakdown:</div>
                      
                      {tripData.budget.travel > 0 && (
                        <div className="flex justify-between items-center py-1 px-2 bg-blue-50 rounded-md">
                          <span className="text-xs text-blue-700 font-medium">✈️ Travel:</span>
                          <span className="text-xs font-semibold text-blue-800">
                            {/* Check if values look like percentages (≤100) or dollars (>100) */}
                            {tripData.budget.travel <= 100 && tripData.budget.total > tripData.budget.travel ? 
                              `${tripData.budget.travel}% ($${Math.round((tripData.budget.travel / 100) * tripData.budget.total).toLocaleString()})` :
                              `$${tripData.budget.travel.toLocaleString()}`
                            }
                          </span>
                        </div>
                      )}
                      
                      {tripData.budget.accommodation > 0 && (
                        <div className="flex justify-between items-center py-1 px-2 bg-green-50 rounded-md">
                          <span className="text-xs text-green-700 font-medium">🏨 Stay:</span>
                          <span className="text-xs font-semibold text-green-800">
                            {tripData.budget.accommodation <= 100 && tripData.budget.total > tripData.budget.accommodation ? 
                              `${tripData.budget.accommodation}% ($${Math.round((tripData.budget.accommodation / 100) * tripData.budget.total).toLocaleString()})` :
                              `$${tripData.budget.accommodation.toLocaleString()}`
                            }
                          </span>
                        </div>
                      )}
                      
                      {tripData.budget.food > 0 && (
                        <div className="flex justify-between items-center py-1 px-2 bg-orange-50 rounded-md">
                          <span className="text-xs text-orange-700 font-medium">🍽️ Food:</span>
                          <span className="text-xs font-semibold text-orange-800">
                            {tripData.budget.food <= 100 && tripData.budget.total > tripData.budget.food ? 
                              `${tripData.budget.food}% ($${Math.round((tripData.budget.food / 100) * tripData.budget.total).toLocaleString()})` :
                              `$${tripData.budget.food.toLocaleString()}`
                            }
                          </span>
                        </div>
                      )}
                      
                      {tripData.budget.events > 0 && (
                        <div className="flex justify-between items-center py-1 px-2 bg-purple-50 rounded-md">
                          <span className="text-xs text-purple-700 font-medium">🎉 Events:</span>
                          <span className="text-xs font-semibold text-purple-800">
                            {tripData.budget.events <= 100 && tripData.budget.total > tripData.budget.events ? 
                              `${tripData.budget.events}% ($${Math.round((tripData.budget.events / 100) * tripData.budget.total).toLocaleString()})` :
                              `$${tripData.budget.events.toLocaleString()}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Show results info only if we're on results step */}
            {currentStep === "results" && tripData.selectedTrip && (
              <div className="border-t border-gray-200 mt-3 pt-3">
                <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg shadow-sm">
                  <span className="font-medium text-gray-600">✨ Selected Trip:</span>
                  <span className="font-bold text-green-600 text-xs">{tripData.selectedTrip.title}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {currentStep === "destinations" && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-sm text-blue-900 mb-2">Next Steps</h4>
          <p className="text-xs text-blue-700 mb-3">
            Add your destinations and start date, then click "Continue to Budget Planning" to proceed.
          </p>
          {tripData?.cities?.length > 0 && tripData?.startDate && (
            <div className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle className="w-3 h-3" />
              <span>Ready to proceed to budget planning!</span>
            </div>
          )}
        </div>
      )}

      {currentStep === "budget" && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-sm text-green-900 mb-2">Budget Planning</h4>
          <p className="text-xs text-green-700 mb-3">
            Set your total budget and allocate spending across categories.
          </p>
          {tripData?.budget?.total && (
            <div className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle className="w-3 h-3" />
              <span>Budget set! Ready for preferences.</span>
            </div>
          )}
        </div>
      )}

      {currentStep === "preferences" && (
        <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-semibold text-sm text-purple-900 mb-2">Travel Preferences</h4>
          <p className="text-xs text-purple-700 mb-3">
            Tell us about your travel style and group size.
          </p>
          {tripData?.people && tripData?.travelType && (
            <div className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle className="w-3 h-3" />
              <span>Preferences set! Ready to see results.</span>
            </div>
          )}
        </div>
      )}

      {currentStep === "results" && (
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-sm text-yellow-900 mb-2">Trip Results</h4>
          <p className="text-xs text-yellow-700">
            Choose from our curated trip suggestions based on your preferences.
          </p>
        </div>
      )}
    </div>
  );
};

export default TripPlanningSidebar;
