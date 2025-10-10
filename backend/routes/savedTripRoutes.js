import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  saveTrip,
  getSavedTrips,
  getSavedTrip,
  updateSavedTrip,
  deleteSavedTrip,
  checkTripSaved,
} from "../controllers/savedTripController.js";

const router = Router();

// All routes require authentication
router.use(auth);

// Save a new trip
router.post("/", saveTrip);

// Get all saved trips for the user
router.get("/", getSavedTrips);

// Check if a trip is already saved
router.get("/check", checkTripSaved);

// Get a specific saved trip
router.get("/:id", getSavedTrip);

// Update a saved trip
router.put("/:id", updateSavedTrip);

// Delete a saved trip
router.delete("/:id", deleteSavedTrip);

export default router;
