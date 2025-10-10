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
  toggleActivityCompletion,
  setDayCompletion,
  setTripCompletion,
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

// Completion endpoints
router.put("/:id/activities/toggle", toggleActivityCompletion);
router.put("/:id/days/complete", setDayCompletion);
router.put("/:id/complete", setTripCompletion);

// Delete a saved trip
router.delete("/:id", deleteSavedTrip);

// Auto-completion service routes (admin only)
router.post("/admin/auto-complete/run", async (req, res) => {
  try {
    const { default: tripAutoCompletionService } = await import(
      "../services/tripAutoCompletionService.js"
    );
    await tripAutoCompletionService.runManualCheck();
    res.json({ message: "Manual auto-completion check completed" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to run manual check", details: error.message });
  }
});

router.get("/admin/auto-complete/status", async (req, res) => {
  try {
    const { default: tripAutoCompletionService } = await import(
      "../services/tripAutoCompletionService.js"
    );
    const status = tripAutoCompletionService.getStatus();
    res.json(status);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get service status", details: error.message });
  }
});

export default router;
