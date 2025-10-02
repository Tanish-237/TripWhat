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
    id: "budget",
    title: "Budget",
    icon: DollarSign,
    description: "Set your budget",
  },
  {
    id: "preferences",
    title: "Preferences",
    icon: Users,
    description: "Travel preferences",
  },
  {
    id: "results",
    title: "Results",
    icon: Sparkles,
    description: "Choose your trip",
  },
];

const TripPlanningSidebar = ({ currentStep, onStepClick, tripData }) => {
  const getStepStatus = (stepId) => {
    if (currentStep === stepId) return "current";
    
    // Check if step is completed based on trip data
    switch (stepId) {
      case "destinations":
        return tripData?.cities?.length > 0 && tripData?.startDate ? "completed" : "pending";
      case "budget":
        return tripData?.budget?.total ? "completed" : "pending";
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
      case "budget":
        // Can only access budget after destinations are completed
        return tripData?.cities?.length > 0 && tripData?.startDate;
      case "preferences":
        // Can only access preferences after budget is completed
        return tripData?.cities?.length > 0 && tripData?.startDate && tripData?.budget?.total;
      case "results":
        // Can only access results after preferences are completed
        return tripData?.cities?.length > 0 && tripData?.startDate && 
               tripData?.budget?.total && tripData?.people && tripData?.travelType;
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

      {/* Trip Summary */}
      {tripData && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Trip Summary</h3>
          <div className="space-y-2 text-xs text-gray-600">
            {/* Always show destinations info if available */}
            {tripData.cities && tripData.cities.length > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Destinations:</span>
                  <span className="font-medium">{tripData.cities.length} cities</span>
                </div>
                <div className="text-xs text-gray-500 mb-2 break-words">
                  {tripData.cities.map(city => `${city.name} (${city.days}d)`).join(', ')}
                </div>
              </>
            )}
            {tripData.startDate && (
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="font-medium">
                  {new Date(tripData.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {tripData.totalDays && (
              <div className="flex justify-between">
                <span>Total Days:</span>
                <span className="font-medium">{tripData.totalDays}</span>
              </div>
            )}

            {/* Show budget info only if we're past destinations step */}
            {(currentStep === "budget" || currentStep === "preferences" || currentStep === "results") && tripData.budget && (
              <>
                <div className="border-t border-gray-200 mt-3 pt-2">
                  <div className="flex justify-between">
                    <span>Total Budget:</span>
                    <span className="font-medium">${tripData.budget.total?.toLocaleString()}</span>
                  </div>
                  {tripData.budget.travel && (
                    <div className="text-xs text-gray-500 mt-1">
                      Travel: {tripData.budget.travel}% • Accommodation: {tripData.budget.accommodation}% • 
                      Food: {tripData.budget.food}% • Events: {tripData.budget.events}%
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Show preferences info only if we're past budget step */}
            {(currentStep === "preferences" || currentStep === "results") && (
              <>
                {tripData.people && (
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span>Travelers:</span>
                    <span className="font-medium">{tripData.people} {tripData.people === 1 ? 'person' : 'people'}</span>
                  </div>
                )}
                {tripData.travelType && (
                  <div className="flex justify-between">
                    <span>Travel Type:</span>
                    <span className="font-medium capitalize">{tripData.travelType}</span>
                  </div>
                )}
              </>
            )}

            {/* Show results info only if we're on results step */}
            {currentStep === "results" && tripData.selectedTrip && (
              <div className="border-t border-gray-200 mt-3 pt-2">
                <div className="flex justify-between">
                  <span>Selected Trip:</span>
                  <span className="font-medium text-xs">{tripData.selectedTrip.title}</span>
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
