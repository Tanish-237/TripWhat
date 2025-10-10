import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  saveTrip,
  getSavedTrips,
  getSavedTrip,
  updateSavedTrip,
  deleteSavedTrip,
  checkTripSaved,
  markTripAsUpcoming,
  removeTripFromUpcoming,
  getUpcomingTrips,
  getCompletedTrips,
  markTripAsCompleted,
} from "../controllers/savedTripController.js";

const router = Router();

// All routes require authentication
router.use(auth);

// Save a new trip
router.post("/", saveTrip);

// Get all saved trips for the user
router.get("/", getSavedTrips);

// Get upcoming trips for the user
router.get("/upcoming", getUpcomingTrips);

// Get completed trips for the user
router.get("/completed", getCompletedTrips);

// Check if a trip is already saved
router.get("/check", checkTripSaved);

// Get a specific saved trip
router.get("/:id", getSavedTrip);

// Update a saved trip
router.put("/:id", updateSavedTrip);

// Mark trip as upcoming
router.put("/:id/upcoming", markTripAsUpcoming);

// Mark trip as completed
router.put("/:id/completed", markTripAsCompleted);

// Remove trip from upcoming
router.delete("/:id/upcoming", removeTripFromUpcoming);

// Delete a saved trip
router.delete("/:id", deleteSavedTrip);

export default router;
