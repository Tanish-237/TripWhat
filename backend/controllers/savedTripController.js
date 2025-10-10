import SavedTrip from "../models/SavedTrip.js";

// Helper to recompute completion percent and flags
function computeCompletion(savedTrip) {
  try {
    const days = savedTrip?.generatedItinerary?.days || [];
    let total = 0;
    let completed = 0;

    console.log(`🔍 computeCompletion for "${savedTrip.title}"`);
    console.log(`   Days in itinerary: ${days.length}`);
    console.log(
      `   Completed activities array: [${
        savedTrip.completedActivities?.join(", ") || "none"
      }]`
    );

    days.forEach((day, dayIdx) => {
      (day.timeSlots || []).forEach((slot, slotIdx) => {
        (slot.activities || []).forEach((act, actIdx) => {
          total += 1;
          const key = `${dayIdx}-${slotIdx}-${actIdx}`;
          const isInArray = savedTrip.completedActivities?.includes(key);
          const isActivityCompleted = act.isCompleted;

          if (isInArray || isActivityCompleted) {
            completed += 1;
            console.log(
              `     ✅ Activity ${key} is completed (inArray: ${isInArray}, actCompleted: ${isActivityCompleted})`
            );
          } else {
            console.log(`     ❌ Activity ${key} is not completed`);
          }
        });
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    console.log(`   Final calculation: ${completed}/${total} = ${percent}%`);

    savedTrip.completionPercent = percent;
    savedTrip.isCompleted = percent === 100;
    if (savedTrip.isCompleted && !savedTrip.completedAt) {
      savedTrip.completedAt = new Date();
    }
    if (!savedTrip.isCompleted) {
      savedTrip.completedAt = null;
    }

    console.log(
      `   Updated completion: ${percent}%, isCompleted: ${savedTrip.isCompleted}`
    );
  } catch (e) {
    console.error("Error in computeCompletion:", e);
  }
}

// Helper to check if a trip should be auto-completed based on dates
function checkAutoCompletion(savedTrip) {
  if (
    !savedTrip.isUpcoming ||
    savedTrip.isCompleted ||
    !savedTrip.tripEndDate
  ) {
    return false;
  }

  const now = new Date();
  const tripEndDate = new Date(savedTrip.tripEndDate);
  const oneDayLater = new Date(tripEndDate.getTime() + 24 * 60 * 60 * 1000);

  // Auto-complete if trip ended more than 24 hours ago
  return now > oneDayLater;
}

// Helper to auto-complete a trip
async function autoCompleteTrip(savedTrip) {
  try {
    console.log(`🤖 Auto-completing trip: "${savedTrip.title}"`);

    // Set all activities as completed
    const days = savedTrip.generatedItinerary?.days || [];
    const completedActivities = [];

    days.forEach((day, dayIndex) => {
      (day.timeSlots || []).forEach((slot, timeSlotIndex) => {
        (slot.activities || []).forEach((activity, activityIndex) => {
          const key = `${dayIndex}-${timeSlotIndex}-${activityIndex}`;
          completedActivities.push(key);

          // Mark activity as completed in the nested structure
          if (activity) {
            activity.isCompleted = true;
          }
        });
      });
    });

    // Update the trip
    savedTrip.isCompleted = true;
    savedTrip.completionPercent = 100;
    savedTrip.completedActivities = completedActivities;
    savedTrip.completedAt = new Date();

    await savedTrip.save();
    console.log(`✅ Auto-completed trip: "${savedTrip.title}"`);

    return savedTrip;
  } catch (error) {
    console.error(
      `❌ Failed to auto-complete trip "${savedTrip.title}":`,
      error
    );
    throw error;
  }
}

// Save a trip
export const saveTrip = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      cities,
      totalDays,
      people,
      travelType,
      budget,
      budgetMode,
      generatedItinerary,
      isPublic = false,
      tags = [],
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !startDate ||
      !cities ||
      !people ||
      !travelType ||
      !budget ||
      !generatedItinerary
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: title, startDate, cities, people, travelType, budget, generatedItinerary",
      });
    }

    // Validate user authentication
    if (!req.userId) {
      return res.status(401).json({
        error: "User authentication required",
      });
    }

    // Create the saved trip
    const savedTrip = new SavedTrip({
      user: req.userId,
      title,
      description,
      startDate: new Date(startDate),
      cities,
      totalDays,
      people,
      travelType,
      budget,
      budgetMode,
      generatedItinerary,
      isPublic,
      tags,
    });

    await savedTrip.save();

    computeCompletion(savedTrip);
    await savedTrip.save();

    res.status(201).json({
      message: "Trip saved successfully",
      savedTrip,
    });
  } catch (error) {
    console.error("Error saving trip:", error);
    res.status(500).json({
      error: "Failed to save trip",
      details: error.message,
    });
  }
};

// Get all saved trips for a user
export const getSavedTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.userId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const savedTrips = await SavedTrip.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SavedTrip.countDocuments(query);

    res.json({
      savedTrips,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching saved trips:", error);
    res.status(500).json({
      error: "Failed to fetch saved trips",
      details: error.message,
    });
  }
};

// Get a specific saved trip
export const getSavedTrip = async (req, res) => {
  try {
    const { id } = req.params;

    let savedTrip = await SavedTrip.findOne({
      _id: id,
      user: req.userId,
    });

    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    // Check if trip should be auto-completed
    if (checkAutoCompletion(savedTrip)) {
      savedTrip = await autoCompleteTrip(savedTrip);
    }

    res.json(savedTrip);
  } catch (error) {
    console.error("Error fetching saved trip:", error);
    res.status(500).json({
      error: "Failed to fetch saved trip",
      details: error.message,
    });
  }
};

// Update a saved trip
export const updateSavedTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.user;
    delete updates._id;
    delete updates.createdAt;

    const savedTrip = await SavedTrip.findOne({ _id: id, user: req.userId });
    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    // Apply shallow updates
    Object.assign(savedTrip, updates);
    computeCompletion(savedTrip);
    await savedTrip.save();

    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    res.json({
      message: "Trip updated successfully",
      savedTrip,
    });
  } catch (error) {
    console.error("Error updating saved trip:", error);
    res.status(500).json({
      error: "Failed to update saved trip",
      details: error.message,
    });
  }
};

// Delete a saved trip
export const deleteSavedTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const savedTrip = await SavedTrip.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    res.json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting saved trip:", error);
    res.status(500).json({
      error: "Failed to delete saved trip",
      details: error.message,
    });
  }
};

// Check if a trip is already saved (to prevent duplicates)
export const checkTripSaved = async (req, res) => {
  try {
    const { startDate, cities, people, travelType } = req.query;

    if (!startDate || !cities || !people || !travelType) {
      return res.status(400).json({
        error: "Missing required query parameters",
      });
    }

    const existingTrip = await SavedTrip.findOne({
      user: req.userId,
      startDate: new Date(startDate),
      people: parseInt(people),
      travelType,
      "cities.name": { $in: JSON.parse(cities).map((c) => c.name) },
    });

    res.json({
      isSaved: !!existingTrip,
      savedTrip: existingTrip,
    });
  } catch (error) {
    console.error("Error checking if trip is saved:", error);
    res.status(500).json({
      error: "Failed to check trip status",
      details: error.message,
    });
  }
};

// Mark a trip as upcoming
export const markTripAsUpcoming = async (req, res) => {
  try {
    const { id } = req.params;
    const { tripStartDate } = req.body;

    if (!tripStartDate) {
      return res.status(400).json({
        error: "Trip start date is required",
      });
    }

    // Get the trip to calculate end date
    const trip = await SavedTrip.findOne({ _id: id, user: req.userId });
    if (!trip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    // Calculate end date: start date + total days
    const startDate = new Date(tripStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + trip.totalDays);

    const savedTrip = await SavedTrip.findOneAndUpdate(
      { _id: id, user: req.userId },
      {
        isUpcoming: true,
        tripStartDate: startDate,
        tripEndDate: endDate,
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Trip marked as upcoming successfully",
      savedTrip,
    });
  } catch (error) {
    console.error("Error marking trip as upcoming:", error);
    res.status(500).json({
      error: "Failed to mark trip as upcoming",
      details: error.message,
    });
  }
};

// Remove trip from upcoming
export const removeTripFromUpcoming = async (req, res) => {
  try {
    const { id } = req.params;

    const savedTrip = await SavedTrip.findOneAndUpdate(
      { _id: id, user: req.userId },
      {
        isUpcoming: false,
        tripStartDate: null,
        tripEndDate: null,
      },
      { new: true, runValidators: true }
    );

    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    res.json({
      message: "Trip removed from upcoming successfully",
      savedTrip,
    });
  } catch (error) {
    console.error("Error removing trip from upcoming:", error);
    res.status(500).json({
      error: "Failed to remove trip from upcoming",
      details: error.message,
    });
  }
};

// Get all upcoming trips for a user
export const getUpcomingTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let upcomingTrips = await SavedTrip.find({
      user: req.userId,
      isUpcoming: true,
    })
      .sort({ tripStartDate: 1 }) // Sort by trip start date, earliest first
      .skip(skip)
      .limit(parseInt(limit));

    // Check each trip for auto-completion
    const updatedTrips = [];
    for (let trip of upcomingTrips) {
      if (checkAutoCompletion(trip)) {
        trip = await autoCompleteTrip(trip);
      }
      updatedTrips.push(trip);
    }

    const total = await SavedTrip.countDocuments({
      user: req.userId,
      isUpcoming: true,
    });

    res.json({
      upcomingTrips: updatedTrips,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching upcoming trips:", error);
    res.status(500).json({
      error: "Failed to fetch upcoming trips",
      details: error.message,
    });
  }
};

// Toggle a specific activity completion
export const toggleActivityCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { dayIndex, timeSlotIndex, activityIndex, completed } = req.body;

    if (
      dayIndex === undefined ||
      timeSlotIndex === undefined ||
      activityIndex === undefined
    ) {
      return res.status(400).json({ error: "Missing indices" });
    }

    const savedTrip = await SavedTrip.findOne({ _id: id, user: req.userId });
    if (!savedTrip) {
      return res.status(404).json({ error: "Saved trip not found" });
    }

    const key = `${dayIndex}-${timeSlotIndex}-${activityIndex}`;
    const setCompleted = completed === undefined ? undefined : !!completed;

    // Update flat completedActivities list
    savedTrip.completedActivities = savedTrip.completedActivities || [];
    const has = savedTrip.completedActivities.includes(key);
    if (setCompleted === true || (setCompleted === undefined && !has)) {
      if (!has) savedTrip.completedActivities.push(key);
    } else if (setCompleted === false || (setCompleted === undefined && has)) {
      savedTrip.completedActivities = savedTrip.completedActivities.filter(
        (k) => k !== key
      );
    }

    // Also set on embedded document if exists
    const day = savedTrip.generatedItinerary?.days?.[dayIndex];
    const slot = day?.timeSlots?.[timeSlotIndex];
    const act = slot?.activities?.[activityIndex];
    if (act) {
      act.isCompleted = setCompleted !== undefined ? setCompleted : !has;
    }

    computeCompletion(savedTrip);
    await savedTrip.save();

    console.log(`🔍 Activity completion updated for trip "${savedTrip.title}"`);
    console.log(
      `   Completion: ${savedTrip.completionPercent}%, isCompleted: ${savedTrip.isCompleted}`
    );
    console.log(
      `   Total completed activities: ${
        savedTrip.completedActivities?.length || 0
      }`
    );

    res.json({
      message: "Activity completion updated",
      savedTrip,
    });
  } catch (error) {
    console.error("Error updating activity completion:", error);
    res.status(500).json({ error: "Failed to update activity completion" });
  }
};

// Mark or unmark an entire day as completed
export const setDayCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { dayIndex, completed } = req.body;
    if (dayIndex === undefined) {
      return res.status(400).json({ error: "Missing dayIndex" });
    }

    const savedTrip = await SavedTrip.findOne({ _id: id, user: req.userId });
    if (!savedTrip)
      return res.status(404).json({ error: "Saved trip not found" });

    const day = savedTrip.generatedItinerary?.days?.[dayIndex];
    if (!day) return res.status(400).json({ error: "Invalid dayIndex" });

    (day.timeSlots || []).forEach((slot, timeSlotIndex) => {
      (slot.activities || []).forEach((_, activityIndex) => {
        const key = `${dayIndex}-${timeSlotIndex}-${activityIndex}`;
        const has = savedTrip.completedActivities?.includes(key);
        const setTo = completed === undefined ? true : !!completed;
        if (setTo && !has) {
          savedTrip.completedActivities.push(key);
        }
        if (!setTo && has) {
          savedTrip.completedActivities = savedTrip.completedActivities.filter(
            (k) => k !== key
          );
        }
        const act = slot.activities[activityIndex];
        if (act) act.isCompleted = setTo;
      });
    });

    computeCompletion(savedTrip);
    await savedTrip.save();
    res.json({ message: "Day completion updated", savedTrip });
  } catch (error) {
    console.error("Error setting day completion:", error);
    res.status(500).json({ error: "Failed to set day completion" });
  }
};

// Mark or unmark entire trip as completed
export const setTripCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const savedTrip = await SavedTrip.findOne({ _id: id, user: req.userId });
    if (!savedTrip)
      return res.status(404).json({ error: "Saved trip not found" });

    const setTo = !!completed;
    const days = savedTrip.generatedItinerary?.days || [];
    savedTrip.completedActivities = [];
    days.forEach((day, dayIndex) => {
      (day.timeSlots || []).forEach((slot, timeSlotIndex) => {
        (slot.activities || []).forEach((act, activityIndex) => {
          const key = `${dayIndex}-${timeSlotIndex}-${activityIndex}`;
          if (setTo) savedTrip.completedActivities.push(key);
          if (act) act.isCompleted = setTo;
        });
      });
    });

    computeCompletion(savedTrip);
    await savedTrip.save();
    res.json({ message: "Trip completion updated", savedTrip });
  } catch (error) {
    console.error("Error setting trip completion:", error);
    res.status(500).json({ error: "Failed to set trip completion" });
  }
};

// List completed trips (any percent or fully completed)
export const getCompletedTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10, anyPercent = "true" } = req.query;
    const skip = (page - 1) * limit;
    const query = { user: req.userId };

    console.log("🔍 getCompletedTrips - Query params:", {
      page,
      limit,
      anyPercent,
    });
    console.log("🔍 getCompletedTrips - User ID:", req.userId);

    if (anyPercent === "true") {
      query.completionPercent = { $gt: 0 };
      console.log(
        "🔍 getCompletedTrips - Looking for trips with completion > 0%"
      );
    } else {
      query.isCompleted = true;
      console.log(
        "🔍 getCompletedTrips - Looking for fully completed trips only"
      );
    }

    console.log("🔍 getCompletedTrips - Final query:", query);

    const trips = await SavedTrip.find(query)
      .sort({ completedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`🔍 getCompletedTrips - Found ${trips.length} trips`);

    // Debug each trip's completion status
    trips.forEach((trip, i) => {
      console.log(
        `🔍 Trip ${i + 1}: "${trip.title}" - ${
          trip.completionPercent
        }% complete, isCompleted: ${trip.isCompleted}`
      );
      console.log(
        `   Completed activities: ${trip.completedActivities?.length || 0}`
      );
    });

    const total = await SavedTrip.countDocuments(query);

    res.json({
      completedTrips: trips,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching completed trips:", error);
    res.status(500).json({ error: "Failed to fetch completed trips" });
  }
};
