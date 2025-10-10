import React, { createContext, useContext, useState, useEffect } from "react";

const TripContext = createContext();

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error("useTrip must be used within a TripProvider");
  }
  return context;
};

export const TripProvider = ({ children }) => {
  const [tripData, setTripData] = useState({
    // Destinations data
    cities: [],
    startDate: null,
    startLocation: null,
    totalDays: null,

    // Budget data - start with null/empty values
    budget: null,
    budgetMode: "capped", // Remember budget mode preference

    // Preferences data - start with null/empty values
    people: null,
    travelType: null,

    // Results data
    selectedTrip: null,
  });

  useEffect(() => {
    try {
      localStorage.setItem("tripwhat_tripData", JSON.stringify(tripData));
    } catch {}
  }, [tripData]);

  const updateTripData = (newData) => {
    setTripData((prev) => ({ ...prev, ...newData }));
  };

  const resetTripData = () => {
    setTripData({
      cities: [],
      startDate: null,
      startLocation: null,
      totalDays: 0,
      budget: {
        total: 5000,
        travel: 40,
        accommodation: 30,
        food: 20,
        events: 10,
      },
      people: 1,
      travelType: "",
      selectedTrip: null,
    });
  };

  return (
    <TripContext.Provider
      value={{
        tripData,
        updateTripData,
        resetTripData,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};
