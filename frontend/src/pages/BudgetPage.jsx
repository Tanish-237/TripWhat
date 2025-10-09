import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import TripPlanningSidebar from "@/components/TripPlanningSidebar";
import { useTrip } from "@/contexts/TripContext";
import { DollarSign, Plane, Home, Utensils, Calendar, ArrowRight, ArrowLeft } from "lucide-react";

const BudgetPage = () => {
  const navigate = useNavigate();
  const { tripData, updateTripData } = useTrip();

  // Budget mode: 'capped' or 'flexible' - initialize from tripData
  const [budgetMode, setBudgetMode] = useState(tripData?.budgetMode || 'capped');
  
  // Separate state for each mode to preserve values when switching
  const [cappedBudget, setCappedBudget] = useState({
    total: 5000,
    travel: 25,
    accommodation: 25,
    food: 25,
    events: 25,
  });
  
  const [flexibleBudget, setFlexibleBudget] = useState({
    total: 0,
    travel: 0,
    accommodation: 0,
    food: 0,
    events: 0,
  });
  
  // Current budget based on mode
  const budget = budgetMode === 'capped' ? cappedBudget : flexibleBudget;

  // Handle budget mode switching
  const handleBudgetModeChange = (newMode) => {
    // First update state locally
    setBudgetMode(newMode);
    
    // Update trip data with current mode's budget and save the mode preference
    const currentBudget = newMode === 'capped' ? cappedBudget : flexibleBudget;
    updateTripData({ budget: currentBudget, budgetMode: newMode });
  };

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

  // Update local state when tripData changes - but only once on component mount
  React.useEffect(() => {
    // Initialize budget with default values if not set
    if (!tripData.budget) {
      console.log("Budget not found in tripData, initializing with default values");
      const defaultBudget = {
        total: 5000,
        travel: 25,
        accommodation: 25,
        food: 25,
        events: 25
      };
      
      // Save default budget to context
      updateTripData({ 
        budget: defaultBudget,
        budgetMode: 'capped' 
      });
      
      // Update local state
      setCappedBudget(defaultBudget);
    }
    else if (tripData?.budget) {
      // Try to detect if the stored budget is in percentage format (capped) or dollar format (flexible)
      const categories = ['travel', 'accommodation', 'food', 'events'];
      const categoryValues = categories.map(cat => tripData.budget[cat] || 0);
      const totalCategoryValues = categoryValues.reduce((sum, val) => sum + val, 0);
      
      // If all category values are <= 100 and sum to around 100, it's percentage format (capped mode)
      const looksLikePercentages = categoryValues.every(val => val <= 100) && 
                                  Math.abs(totalCategoryValues - 100) < 10;
      
      if (looksLikePercentages) {
        // This is capped budget data (percentages)
        setCappedBudget(tripData.budget);
        // Don't overwrite flexible budget with percentage data
      } else {
        // This is flexible budget data (dollar amounts)
        setFlexibleBudget(tripData.budget);
        // Don't overwrite capped budget with dollar data
      }
    }
  }, []); // Only run once on mount

  // Capped Budget Mode: Update percentages, auto-adjust others if needed
  const updateCappedBudget = (category, value) => {
    const newBudget = { ...cappedBudget, [category]: value };

    // Calculate total percentage
    const totalPercentage = Object.keys(newBudget)
      .filter(key => key !== 'total')
      .reduce((sum, key) => sum + newBudget[key], 0);

    if (totalPercentage <= 100) {
      setCappedBudget(newBudget);
      updateTripData({ budget: newBudget });
    } else {
      // Auto-adjust other categories to make room
      const otherCategories = Object.keys(newBudget).filter(key => key !== 'total' && key !== category);
      const remaining = 100 - value;
      const otherTotal = otherCategories.reduce((sum, key) => sum + cappedBudget[key], 0);

      if (remaining >= 0 && otherTotal > 0) {
        const adjustedBudget = { ...newBudget };
        otherCategories.forEach(key => {
          adjustedBudget[key] = Math.round((cappedBudget[key] / otherTotal) * remaining);
        });

        // Fix rounding errors
        const finalTotal = Object.keys(adjustedBudget)
          .filter(key => key !== 'total')
          .reduce((sum, key) => sum + adjustedBudget[key], 0);

        if (finalTotal !== 100) {
          const diff = 100 - finalTotal;
          const firstCategory = otherCategories[0];
          if (firstCategory && adjustedBudget[firstCategory] + diff >= 0) {
            adjustedBudget[firstCategory] += diff;
          }
        }

        setCappedBudget(adjustedBudget);
        updateTripData({ budget: adjustedBudget });
      }
    }
  };

  // Flexible Budget Mode: Update dollar amounts, auto-calculate total and percentages
  const updateFlexibleBudget = (category, dollarAmount) => {
    const newBudget = { ...flexibleBudget, [category]: dollarAmount };

    // Calculate new total
    const newTotal = Object.keys(newBudget)
      .filter(key => key !== 'total')
      .reduce((sum, key) => sum + newBudget[key], 0);

    newBudget.total = newTotal;

    setFlexibleBudget(newBudget);
    updateTripData({ budget: newBudget });
  };

  // Update total budget (only in capped mode)
  const updateTotalBudget = (value) => {
    const newBudget = { ...cappedBudget, total: value };
    setCappedBudget(newBudget);
    updateTripData({ budget: newBudget });
  };

  // Calculate dollar amounts from percentages (capped mode)
  const calculateAmount = (percentage) => {
    if (budgetMode === 'capped') {
      return Math.round((budget.total * percentage) / 100);
    }
    return percentage; // In flexible mode, percentage IS the dollar amount
  };

  // Calculate percentages from dollar amounts (flexible mode)
  const calculatePercentage = (dollarAmount) => {
    if (budget.total === 0) return 0;
    return Math.round((dollarAmount / budget.total) * 100);
  };

  // Get total percentage
  const getTotalPercentage = () => {
    if (budgetMode === 'capped') {
      const total = cappedBudget.travel + cappedBudget.accommodation + cappedBudget.food + cappedBudget.events;
      // Cap the total at reasonable values to prevent display issues
      return Math.min(Math.max(total || 0, 0), 400); // Cap at 400% to handle edge cases
    }
    return 100; // Always 100% in flexible mode
  };

  // Reset functions for both modes
  const resetToBalanced = () => {
    if (budgetMode === 'capped') {
      const balancedBudget = {
        ...cappedBudget,
        travel: 25,
        accommodation: 25,
        food: 25,
        events: 25,
      };
      setCappedBudget(balancedBudget);
      updateTripData({ budget: balancedBudget });
    } else {
      // For flexible mode, reset everything to 0
      const resetBudget = {
        total: 0,
        travel: 0,
        accommodation: 0,
        food: 0,
        events: 0,
      };
      setFlexibleBudget(resetBudget);
      updateTripData({ budget: resetBudget });
    }
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

  // Helper function to validate budget completion
  const isBudgetValid = () => {
    // For default values, always consider budget valid
    if (budgetMode === 'capped' && 
        budget.total === 5000 && 
        budget.travel === 25 && 
        budget.accommodation === 25 && 
        budget.food === 25 && 
        budget.events === 25) {
      return true;
    }
    
    if (!budget || !budget.total || budget.total <= 0) return false;

    // Check if all categories have valid allocations
    const categories = ['travel', 'accommodation', 'food', 'events'];
    const hasValidAllocations = categories.every(cat => 
      budget[cat] !== undefined && budget[cat] >= 0
    );

    if (!hasValidAllocations) return false;

    // For percentage-based budget (capped mode), check if total equals 100%
    const totalAllocations = categories.reduce((sum, cat) => sum + (budget[cat] || 0), 0);

    if (budgetMode === 'capped') {
      return Math.abs(totalAllocations - 100) < 1; // Allow small rounding errors
    }

    // For dollar-based budget (flexible mode), ensure all categories have some allocation
    return totalAllocations > 0;
  };

  const handleNext = () => {
    if (isBudgetValid()) {
      // Ensure the latest budget data is saved before navigating
      // This ensures default values are properly saved if user didn't change anything
      updateTripData({ 
        budget: budget,
        budgetMode: budgetMode
      });
      
      console.log("Navigating to results with budget:", budget);
      navigate('/plan/results');
    }
  };

  const handleStepClick = (step) => {
    switch (step) {
      case "destinations":
        navigate('/plan');
        break;
      case "preferences":
        if (tripData?.cities?.length > 0 && tripData?.startDate) {
          navigate('/plan/preferences');
        }
        break;
      case "budget":
        // Already on budget page
        break;
      case "results":
        if (tripData?.people && tripData?.travelType && tripData?.budget?.total) {
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500 shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Set Your Budget</h1>
                  <p className="text-gray-600 mt-1">
                    Choose your budget planning approach
                  </p>
                </div>
              </div>

              {/* Budget Mode Toggle */}
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-300 shadow-sm">
                <Button
                  variant={budgetMode === 'capped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBudgetModeChange('capped')}
                  className={`text-sm font-medium ${budgetMode === 'capped' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
                >
                  Capped Budget
                </Button>
                <Button
                  variant={budgetMode === 'flexible' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBudgetModeChange('flexible')}
                  className={`text-sm font-medium ${budgetMode === 'flexible' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50'}`}
                >
                  Flexible Budget
                </Button>
              </div>
            </div>

            {/* Mode Description */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                {budgetMode === 'capped' ? (
                  <>
                    <strong>Capped Budget Mode:</strong> Set a maximum budget limit, then allocate percentages across categories. 
                    The system will auto-adjust other categories when you change one to keep the total at 100%.
                  </>
                ) : (
                  <>
                    <strong>Flexible Budget Mode:</strong> Set specific dollar amounts for each category. 
                    Your total budget will automatically adjust based on your category spending.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Total Budget Section */}
          <Card className="p-6 mb-8 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {budgetMode === 'capped' ? 'Maximum Budget' : 'Total Budget (Auto-calculated)'}
              </h3>
              <div className="text-2xl font-bold text-green-600">
                ${budget.total.toLocaleString()}
              </div>
            </div>

            {budgetMode === 'capped' ? (
              <>
                <div className="space-y-3">
                  <Slider
                    value={[budget.total]}
                    onValueChange={([value]) => updateTotalBudget(value)}
                    min={1000}
                    max={100000}
                    step={500}
                    color="green"
                    className="w-full"
                  />
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>$1,000</span>
                    <div className="text-center">
                      <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
                        Set your maximum budget limit
                      </span>
                    </div>
                    <span>$100,000</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  This amount is automatically calculated based on your category allocations below
                </p>
              </div>
            )}
          </Card>

          {/* Budget Categories */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Budget Categories</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToBalanced}
                className="text-sm font-medium border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                Reset to Balanced
              </Button>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              {budgetMode === 'capped' 
                ? 'Allocate your budget across different spending categories. Total must equal 100%.'
                : 'Set specific dollar amounts for each category. Your total budget will adjust automatically.'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {budgetCategories.map((category) => {
              const Icon = category.icon;
              const colors = getColorClasses(category.color);

              return (
                <Card key={category.id} className={`p-6 bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${colors.bg}`}>
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-white shadow-sm ${colors.bg}`}>
                          <Icon className={`w-5 h-5 ${colors.accent}`} />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-lg ${colors.text}`}>
                            {category.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {budgetMode === 'capped' ? (
                          <>
                            <div className={`text-2xl font-bold ${colors.accent}`}>
                              {Math.min(Math.max(budget[category.id] || 0, 0), 100)}%
                            </div>
                            <div className="text-sm text-gray-600">
                              ${calculateAmount(budget[category.id]).toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={`text-2xl font-bold ${colors.accent}`}>
                              ${budget[category.id].toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {calculatePercentage(budget[category.id])}%
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                  <div className="space-y-3">
                    {budgetMode === 'capped' ? (
                      <>
                        <Slider
                          value={[budget[category.id]]}
                          onValueChange={([value]) => updateCappedBudget(category.id, value)}
                          min={0}
                          max={100}
                          step={1}
                          color={category.color}
                          className="w-full"
                        />
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>0%</span>
                          <div className="text-center">
                            <span className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded-full">
                              Available: {100 - (getTotalPercentage() - budget[category.id])}%
                            </span>
                          </div>
                          <span>100%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Slider
                          value={[budget[category.id]]}
                          onValueChange={([value]) => updateFlexibleBudget(category.id, value)}
                          min={0}
                          max={25000}
                          step={50}
                          color={category.color}
                          className="w-full"
                        />
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>$0</span>
                          <div className="text-center">
                            <span className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded-full">
                              {calculatePercentage(budget[category.id])}% of total
                            </span>
                          </div>
                          <span>$25,000</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                </Card>
              );
            })}
          </div>

          {/* Budget Summary */}
          <Card className="p-6 mb-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Budget Allocation Summary</h3>
              {budgetMode === 'capped' && (
                <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                  getTotalPercentage() === 100 
                    ? 'bg-green-100 text-green-800' 
                    : getTotalPercentage() < 100
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  Total: {getTotalPercentage()}%
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {budgetCategories.map((category) => {
                const colors = getColorClasses(category.color);
                return (
                  <div key={category.id} className="text-center">
                    {budgetMode === 'capped' ? (
                      <>
                        <div className={`text-2xl font-bold ${colors.accent} mb-1`}>
                          ${calculateAmount(budget[category.id]).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">{category.name}</div>
                        <div className="text-xs text-gray-500">{Math.min(Math.max(budget[category.id] || 0, 0), 100)}%</div>
                      </>
                    ) : (
                      <>
                        <div className={`text-2xl font-bold ${colors.accent} mb-1`}>
                          ${budget[category.id].toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">{category.name}</div>
                        <div className="text-xs text-gray-500">{calculatePercentage(budget[category.id])}%</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {!isBudgetValid() && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Budget Incomplete
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {budgetMode === 'capped' ? (
                    getTotalPercentage() !== 100 ? 
                      `Please allocate exactly 100% across categories. Currently: ${getTotalPercentage()}%` :
                      'Please ensure all budget categories are properly set.'
                  ) : (
                    budget.total <= 0 ? 
                      'Please set budget amounts for your categories.' :
                      'Please allocate some budget to each category to continue.'
                  )}
                </p>
              </div>
            )}

            {budgetMode === 'capped' && getTotalPercentage() !== 100 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {getTotalPercentage() < 100 
                    ? `You have ${100 - getTotalPercentage()}% unallocated budget remaining.`
                    : `Your allocation exceeds 100% by ${getTotalPercentage() - 100}%. Please adjust your categories.`
                  }
                </p>
              </div>
            )}
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/plan/preferences')}
              className="px-8 py-3 border-gray-400 text-gray-700 hover:bg-gray-100 font-medium shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Preferences
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isBudgetValid()}
              className={`px-8 py-3 font-medium shadow-md ${
                isBudgetValid()
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
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

export default BudgetPage;
