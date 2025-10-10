import Trip from "../models/Trip.js";

export const createTrip = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      startDate,
      startLocation,
      cities,
      totalDays,
      people,
      travelType,
      budget,
      budgetMode,
    } = body;

    if (!req.body) {
      return res
        .status(400)
        .json({ message: "Request body is required (application/json)" });
    }

    if (!startDate || !Array.isArray(cities) || cities.length === 0) {
      return res
        .status(400)
        .json({ message: "startDate and at least one city are required" });
    }
    if (!totalDays || !people || !travelType || !budget?.total) {
      return res.status(400).json({
        message:
          "Missing required fields: totalDays, people, travelType, budget",
      });
    }

    const doc = await Trip.create({
      user: req.userId,
      startDate,
      startLocation,
      cities,
      totalDays,
      people,
      travelType,
      budget: {
        total: budget.total,
        travel: budget.travel,
        accommodation: budget.accommodation,
        food: budget.food,
        events: budget.events,
        mode: budgetMode || "capped",
      },
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Failed to create trip", error: err.message });
  }
};

export const listTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.userId }).sort({ createdAt: -1 });
    return res.json(trips);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Failed to list trips", error: err.message });
  }
};

export const getTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findOne({ _id: id, user: req.userId });
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    return res.json(trip);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Failed to fetch trip", error: err.message });
  }
};
