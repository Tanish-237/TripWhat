import SavedTrip from "../models/SavedTrip.js";

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
