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
  
  // Budget mode: 'capped' or 'flexible'
  const [budgetMode, setBudgetMode] = useState('capped');
  
  const [budget, setBudget] = useState({
    total: tripData?.budget?.total || 5000,
    travel: tripData?.budget?.travel || 25,
    accommodation: tripData?.budget?.accommodation || 25,
    food: tripData?.budget?.food || 25,
    events: tripData?.budget?.events || 25,
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

  // Update local state when tripData changes
  React.useEffect(() => {
    if (tripData?.budget) {
      setBudget(tripData.budget);
    }
  }, [tripData?.budget]);

  // Capped Budget Mode: Update percentages, auto-adjust others if needed
  const updateCappedBudget = (category, value) => {
    const newBudget = { ...budget, [category]: value };
    
    // Calculate total percentage
    const totalPercentage = Object.keys(newBudget)
      .filter(key => key !== 'total')
      .reduce((sum, key) => sum + newBudget[key], 0);
    
    if (totalPercentage <= 100) {
      setBudget(newBudget);
      updateTripData({ budget: newBudget });
    } else {
      // Auto-adjust other categories to make room
      const otherCategories = Object.keys(newBudget).filter(key => key !== 'total' && key !== category);
      const remaining = 100 - value;
      const otherTotal = otherCategories.reduce((sum, key) => sum + budget[key], 0);
      
      if (remaining >= 0 && otherTotal > 0) {
        const adjustedBudget = { ...newBudget };
        otherCategories.forEach(key => {
          adjustedBudget[key] = Math.round((budget[key] / otherTotal) * remaining);
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
        
        setBudget(adjustedBudget);
        updateTripData({ budget: adjustedBudget });
      }
    }
  };

  // Flexible Budget Mode: Update dollar amounts, auto-calculate total and percentages
  const updateFlexibleBudget = (category, dollarAmount) => {
    const newBudget = { ...budget, [category]: dollarAmount };
    
    // Calculate new total
    const newTotal = Object.keys(newBudget)
      .filter(key => key !== 'total')
      .reduce((sum, key) => sum + newBudget[key], 0);
    
    newBudget.total = newTotal;
    
    setBudget(newBudget);
    updateTripData({ budget: newBudget });
  };

  // Update total budget (only in capped mode)
  const updateTotalBudget = (value) => {
    const newBudget = { ...budget, total: value };
    setBudget(newBudget);
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
      return budget.travel + budget.accommodation + budget.food + budget.events;
    }
    return 100; // Always 100% in flexible mode
  };

  // Reset functions for both modes
  const resetToBalanced = () => {
    if (budgetMode === 'capped') {
      const balancedBudget = {
        ...budget,
        travel: 25,
        accommodation: 25,
        food: 25,
        events: 25,
      };
      setBudget(balancedBudget);
      updateTripData({ budget: balancedBudget });
    } else {
      const quarterAmount = Math.round(budget.total / 4);
      const balancedBudget = {
        ...budget,
        travel: quarterAmount,
        accommodation: quarterAmount,
        food: quarterAmount,
        events: quarterAmount,
      };
      setBudget(balancedBudget);
      updateTripData({ budget: balancedBudget });
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
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                <Button
                  variant={budgetMode === 'capped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBudgetMode('capped')}
                  className="text-sm"
                >
                  Capped Budget
                </Button>
                <Button
                  variant={budgetMode === 'flexible' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBudgetMode('flexible')}
                  className="text-sm"
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
                    max={50000}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>$1,000</span>
                    <div className="text-center">
                      <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
                        Set your maximum budget limit
                      </span>
                    </div>
                    <span>$50,000</span>
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
                className="text-sm"
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
                              {budget[category.id]}%
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
                          max={10000}
                          step={50}
                          className="w-full"
                        />
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>$0</span>
                          <div className="text-center">
                            <span className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded-full">
                              {calculatePercentage(budget[category.id])}% of total
                            </span>
                          </div>
                          <span>$10,000</span>
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
                        <div className="text-xs text-gray-500">{budget[category.id]}%</div>
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
              onClick={() => navigate('/plan')}
              className="px-8 py-3"
            >
              Back to Destinations
            </Button>
            <Button
              onClick={handleNext}
              disabled={budgetMode === 'capped' && getTotalPercentage() !== 100}
              className={`px-8 py-3 ${
                (budgetMode === 'flexible' || getTotalPercentage() === 100)
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
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
