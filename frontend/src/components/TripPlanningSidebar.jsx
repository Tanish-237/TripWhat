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
        return tripData?.budget ? "completed" : "pending";
      case "preferences":
        return tripData?.people && tripData?.travelType ? "completed" : "pending";
      case "results":
        return tripData?.selectedTrip ? "completed" : "pending";
      default:
        return "pending";
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
          const isClickable = status === "completed" || step.id === currentStep || 
                             (index > 0 && getStepStatus(steps[index - 1].id) === "completed");

          return (
            <Card
              key={step.id}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200",
                status === "current" && "ring-2 ring-blue-500 bg-blue-50",
                status === "completed" && "bg-green-50 hover:bg-green-100",
                status === "pending" && "bg-gray-50",
                !isClickable && "cursor-not-allowed opacity-50"
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
            {tripData.cities && tripData.cities.length > 0 && (
              <div className="flex justify-between">
                <span>Destinations:</span>
                <span className="font-medium">{tripData.cities.length} cities</span>
              </div>
            )}
            {tripData.startDate && (
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="font-medium">
                  {new Date(tripData.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {tripData.budget && (
              <div className="flex justify-between">
                <span>Total Budget:</span>
                <span className="font-medium">${tripData.budget.total}</span>
              </div>
            )}
            {tripData.people && (
              <div className="flex justify-between">
                <span>Travelers:</span>
                <span className="font-medium">{tripData.people}</span>
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
    </div>
  );
};

export default TripPlanningSidebar;
