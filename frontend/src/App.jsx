import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { TripProvider, useTrip } from "./contexts/TripContext";
import LandingPage from "./pages/LandingPage.jsx";
import TripPlannerPage from "./pages/TripPlannerPage.jsx";
import BudgetPage from "./pages/BudgetPage.jsx";
import PreferencesPage from "./pages/PreferencesPage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import TripDetailsPage from "./pages/TripDetailsPage.jsx";

// Route protection component
const ProtectedRoute = ({ children, condition, redirectTo = "/plan" }) => {
  return condition ? children : <Navigate to={redirectTo} replace />;
};

// App content that has access to TripContext
const AppContent = () => {
  const { tripData } = useTrip();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/plan" element={<TripPlannerPage />} />
        <Route 
          path="/plan/preferences" 
          element={
            <ProtectedRoute condition={tripData?.cities?.length > 0 && tripData?.startDate}>
              <PreferencesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/plan/budget" 
          element={
            <ProtectedRoute condition={tripData?.people && tripData?.travelType}>
              <BudgetPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/plan/results" 
          element={
            <ProtectedRoute condition={tripData?.budget?.total}>
              <ResultsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/plan/details" 
          element={
            <ProtectedRoute condition={tripData?.selectedTrip}>
              <TripDetailsPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <TripProvider>
      <AppContent />
    </TripProvider>
  );
}

export default App;
