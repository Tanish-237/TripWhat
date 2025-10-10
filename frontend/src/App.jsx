import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { TripProvider, useTrip } from "./contexts/TripContext.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import TripPlannerPage from "./pages/TripPlannerPage.jsx";
import BudgetPage from "./pages/BudgetPage.jsx";
import PreferencesPage from "./pages/PreferencesPage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import ItineraryPage from "./pages/ItineraryPage.jsx";
import SavedTripsPage from "./pages/SavedTripsPage.jsx";
import UpcomingTripsPage from "./pages/UpcomingTripsPage.jsx";
import CompletedTripsPage from "./pages/CompletedTripsPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import Home from "./pages/Home.jsx";
import { Chat } from "./pages/Chat.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

function TripPlanningRoute({ children, condition, redirectTo = "/plan" }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  if (condition !== undefined && !condition)
    return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}

function AppContent() {
  const { user } = useAuth();
  const { tripData } = useTrip();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/plan"
          element={
            <ProtectedRoute>
              <TripPlannerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan/preferences"
          element={
            <TripPlanningRoute
              condition={tripData?.cities?.length > 0 && tripData?.startDate}
            >
              <PreferencesPage />
            </TripPlanningRoute>
          }
        />
        <Route
          path="/plan/budget"
          element={
            <TripPlanningRoute
              condition={tripData?.people && tripData?.travelType}
            >
              <BudgetPage />
            </TripPlanningRoute>
          }
        />
        <Route
          path="/plan/results"
          element={
            <TripPlanningRoute condition={tripData?.budget?.total}>
              <ResultsPage />
            </TripPlanningRoute>
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/itinerary"
          element={
            <ProtectedRoute>
              <ItineraryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/saved-trips"
          element={
            <ProtectedRoute>
              <SavedTripsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/completed-trips"
          element={
            <ProtectedRoute>
              <CompletedTripsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upcoming-trips"
          element={
            <ProtectedRoute>
              <UpcomingTripsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            user ? <Navigate to="/chat" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TripProvider>
        <Router>
          <AppContent />
        </Router>
      </TripProvider>
    </AuthProvider>
  );
}

export default App;
