import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TripProvider, useTrip } from './contexts/TripContext';

// Auth pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import OnboardingPage from './pages/OnboardingPage';

// Trip planning pages (from main)
import TripPlannerPage from './pages/TripPlannerPage.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import PreferencesPage from './pages/PreferencesPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';

// Chat functionality (from neel-experiment)
import Home from './pages/Home';
import { Chat } from './pages/Chat';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

// Trip Planning Protected Route (requires both auth and trip conditions)
function TripPlanningRoute({ children, condition, redirectTo = "/plan" }: { children: React.ReactNode, condition?: boolean, redirectTo?: string }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (condition !== undefined && !condition) return <Navigate to={redirectTo} replace />;
  
  return <>{children}</>;
}

// App Content with Context Access
function AppContent() {
  const { user } = useAuth();
  const { tripData } = useTrip();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Protected Routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        
        {/* Trip Planning Flow (original main branch flow) */}
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
        
        {/* Chat & AI Features (from neel-experiment) */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
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
        
        {/* Redirects for authenticated users */}
        <Route
          path="*"
          element={
            user ? <Navigate to="/chat" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>
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
