import SavedTrip from "../models/SavedTrip.js";

// Save a trip
export const saveTrip = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      startLocation,
      cities,
      totalDays,
      people,
      travelType,
      budget,
      budgetMode,
      generatedItinerary,
      travelMeans,
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
      startLocation,
      cities,
      totalDays,
      people,
      travelType,
      budget,
      budgetMode,
      generatedItinerary,
      travelMeans,
      isPublic,
      tags,
    });

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

// Get all saved trips for a user (excluding upcoming and completed)
export const getSavedTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query - only show trips that are not upcoming and not completed
    const query = {
      user: req.userId,
      isUpcoming: { $ne: true },
      isCompleted: { $ne: true },
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { tags: { $in: [new RegExp(search, "i")] } },
          ],
        },
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

    const savedTrip = await SavedTrip.findOne({
      _id: id,
      user: req.userId,
    });

    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
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

    const savedTrip = await SavedTrip.findOneAndUpdate(
      { _id: id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );

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
        isCompleted: false, // Explicitly set to false
        tripStartDate: startDate,
        tripEndDate: endDate,
      },
      { new: true, runValidators: true }
    );

    console.log("✅ Trip marked as upcoming:", {
      id: savedTrip._id,
      title: savedTrip.title,
      isUpcoming: savedTrip.isUpcoming,
      isCompleted: savedTrip.isCompleted,
    });

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

// Remove trip from upcoming (move back to saved)
export const removeTripFromUpcoming = async (req, res) => {
  try {
    const { id } = req.params;

    const savedTrip = await SavedTrip.findOneAndUpdate(
      { _id: id, user: req.userId },
      {
        isUpcoming: false,
        isCompleted: false, // Also reset completed status
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

    console.log("✅ Trip moved to saved:", {
      id: savedTrip._id,
      title: savedTrip.title,
      isUpcoming: savedTrip.isUpcoming,
      isCompleted: savedTrip.isCompleted,
    });

    res.json({
      message: "Trip moved back to saved successfully",
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

    const upcomingTrips = await SavedTrip.find({
      user: req.userId,
      isUpcoming: true,
      isCompleted: { $ne: true }, // Exclude completed trips
    })
      .sort({ tripStartDate: 1 }) // Sort by trip start date, earliest first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SavedTrip.countDocuments({
      user: req.userId,
      isUpcoming: true,
      isCompleted: { $ne: true },
    });

    res.json({
      upcomingTrips,
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

// Get all completed trips for a user
export const getCompletedTrips = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const completedTrips = await SavedTrip.find({
      user: req.userId,
      isCompleted: true,
    })
      .sort({ tripEndDate: -1 }) // Sort by trip end date, most recent first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SavedTrip.countDocuments({
      user: req.userId,
      isCompleted: true,
    });

    res.json({
      completedTrips,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching completed trips:", error);
    res.status(500).json({
      error: "Failed to fetch completed trips",
      details: error.message,
    });
  }
};

// Mark a trip as completed
export const markTripAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const savedTrip = await SavedTrip.findOneAndUpdate(
      { _id: id, user: req.userId },
      {
        isCompleted: true,
        tripEndDate: new Date(), // Set end date to now
      },
      { new: true, runValidators: true }
    );

    if (!savedTrip) {
      return res.status(404).json({
        error: "Saved trip not found",
      });
    }

    console.log("✅ Trip marked as completed:", {
      id: savedTrip._id,
      title: savedTrip.title,
      isUpcoming: savedTrip.isUpcoming,
      isCompleted: savedTrip.isCompleted,
    });

    res.json({
      message: "Trip marked as completed successfully",
      savedTrip,
    });
  } catch (error) {
    console.error("Error marking trip as completed:", error);
    res.status(500).json({
      error: "Failed to mark trip as completed",
      details: error.message,
    });
  }
};

// Get user trip statistics
export const getTripStatistics = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all trips
    const allTrips = await SavedTrip.find({ user: userId });

    console.log("📊 Total trips found:", allTrips.length);
    console.log(
      "Trip flags:",
      allTrips.map((t) => ({
        id: t._id,
        title: t.title,
        isUpcoming: t.isUpcoming,
        isCompleted: t.isCompleted,
      }))
    );

    // Count different trip types (treating undefined/null as false)
    const totalTrips = allTrips.length;
    const savedTrips = allTrips.filter(
      (trip) => trip.isUpcoming !== true && trip.isCompleted !== true
    ).length;
    const upcomingTrips = allTrips.filter(
      (trip) => trip.isUpcoming === true && trip.isCompleted !== true
    ).length;
    const completedTrips = allTrips.filter(
      (trip) => trip.isCompleted === true
    ).length;

    console.log("📊 Statistics calculated:", {
      totalTrips,
      savedTrips,
      upcomingTrips,
      completedTrips,
    });

    // Calculate total days traveled (only from completed trips)
    const completedTripsList = allTrips.filter(
      (trip) => trip.isCompleted === true
    );
    const totalDaysTraveled = completedTripsList.reduce(
      (sum, trip) => sum + (trip.totalDays || 0),
      0
    );

    console.log(
      "📊 Completed trips for stats:",
      completedTripsList.map((t) => ({
        title: t.title,
        totalDays: t.totalDays,
        cities: t.cities?.map((c) => c.name),
      }))
    );

    // Get unique cities visited (from completed trips only)
    const citiesVisited = new Set();
    completedTripsList.forEach((trip) => {
      trip.cities?.forEach((city) => citiesVisited.add(city.name));
    });

    // Get unique countries visited (from completed trips only)
    const countriesVisited = new Set();
    completedTripsList.forEach((trip) => {
      trip.cities?.forEach((city) => {
        // Extract country from city name (simplified)
        const parts = city.name.split(",");
        if (parts.length > 1) {
          countriesVisited.add(parts[parts.length - 1].trim());
        }
      });
    });

    console.log("📊 Travel stats:", {
      totalDaysTraveled,
      citiesVisited: Array.from(citiesVisited),
      countriesVisited: Array.from(countriesVisited),
    });

    // Calculate total activities (from all trips with itineraries)
    const totalActivities = allTrips.reduce((sum, trip) => {
      if (!trip.generatedItinerary?.days) return sum;
      return (
        sum +
        trip.generatedItinerary.days.reduce(
          (daySum, day) =>
            daySum +
            day.timeSlots.reduce(
              (slotSum, slot) => slotSum + slot.activities.length,
              0
            ),
          0
        )
      );
    }, 0);

    // Get most recent trip (from completed trips only)
    const recentTrip = completedTripsList.sort(
      (a, b) => new Date(b.tripEndDate) - new Date(a.tripEndDate)
    )[0];

    // Get upcoming trip (upcoming but not completed)
    const nextTrip = allTrips
      .filter((trip) => trip.isUpcoming === true && trip.isCompleted !== true)
      .sort((a, b) => new Date(a.tripStartDate) - new Date(b.tripStartDate))[0];

    res.json({
      statistics: {
        totalTrips,
        savedTrips,
        upcomingTrips,
        completedTrips,
        totalDaysTraveled,
        citiesVisited: citiesVisited.size,
        countriesVisited: countriesVisited.size,
        totalActivities,
        recentTrip: recentTrip
          ? {
              id: recentTrip._id,
              title: recentTrip.title,
              cities: recentTrip.cities,
              endDate: recentTrip.tripEndDate,
            }
          : null,
        nextTrip: nextTrip
          ? {
              id: nextTrip._id,
              title: nextTrip.title,
              cities: nextTrip.cities,
              startDate: nextTrip.tripStartDate,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching trip statistics:", error);
    res.status(500).json({
      error: "Failed to fetch trip statistics",
      details: error.message,
    });
  }
};
