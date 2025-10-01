import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { TripProvider } from "./contexts/TripContext";
import LandingPage from "./pages/LandingPage.jsx";
import TripPlannerPage from "./pages/TripPlannerPage.jsx";
import BudgetPage from "./pages/BudgetPage.jsx";
import PreferencesPage from "./pages/PreferencesPage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import TripDetailsPage from "./pages/TripDetailsPage.jsx";

function App() {
  return (
    <TripProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/plan" element={<TripPlannerPage />} />
          <Route path="/plan/budget" element={<BudgetPage />} />
          <Route path="/plan/preferences" element={<PreferencesPage />} />
          <Route path="/plan/results" element={<ResultsPage />} />
          <Route path="/plan/details" element={<TripDetailsPage />} />
        </Routes>
      </Router>
    </TripProvider>
  );
}

export default App;
