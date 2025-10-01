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

function App() {
  return (
    <TripProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/plan" element={<TripPlannerPage />} />
          <Route path="/plan/budget" element={<BudgetPage />} />
        </Routes>
      </Router>
    </TripProvider>
  );
}

export default App;
