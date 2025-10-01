import React, { createContext, useContext, useState } from 'react';

const TripContext = createContext();

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};

export const TripProvider = ({ children }) => {
  const [tripData, setTripData] = useState({
    // Destinations data
    cities: [],
    startDate: null,
    totalDays: 0,
    
    // Budget data
    budget: {
      total: 5000,
      travel: 40,
      accommodation: 30,
      food: 20,
      events: 10,
    },
    
    // Preferences data
    people: 1,
    travelType: '',
    
    // Results data
    selectedTrip: null,
  });

  const updateTripData = (newData) => {
    setTripData(prev => ({ ...prev, ...newData }));
  };

  const resetTripData = () => {
    setTripData({
      cities: [],
      startDate: null,
      totalDays: 0,
      budget: {
        total: 5000,
        travel: 40,
        accommodation: 30,
        food: 20,
        events: 10,
      },
      people: 1,
      travelType: '',
      selectedTrip: null,
    });
  };

  return (
    <TripContext.Provider value={{
      tripData,
      updateTripData,
      resetTripData,
    }}>
      {children}
    </TripContext.Provider>
  );
};
