import express from 'express';
import { Trip } from '../models/Trip.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    const {
      title, description, startDate, startLocation, cities,
      totalDays, people, travelType, budget, budgetMode,
      generatedItinerary, travelMeans, isPublic = false, tags = [],
    } = req.body;

    if (!title || !startDate || !cities || !people || !travelType || !budget || !generatedItinerary) {
      return res.status(400).json({
        error: 'Missing required fields: title, startDate, cities, people, travelType, budget, generatedItinerary',
      });
    }

    const trip = new Trip({
      user: req.userId,
      title, description,
      startDate: new Date(startDate),
      startLocation, cities, totalDays, people, travelType,
      budget, budgetMode, generatedItinerary, travelMeans,
      isPublic, tags,
    });

    await trip.save();
    return res.status(201).json({ message: 'Trip saved successfully', savedTrip: trip });
  } catch (error: any) {
    console.error('Error saving trip:', error);
    return res.status(500).json({ error: 'Failed to save trip', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {
      user: req.userId,
      isUpcoming: { $ne: true },
      isCompleted: { $ne: true },
    };

    if (search) {
      query.$and = [{
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } },
        ],
      }];
    }

    const savedTrips = await Trip.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments(query);

    return res.json({
      savedTrips,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching saved trips:', error);
    return res.status(500).json({ error: 'Failed to fetch saved trips', details: error.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const upcomingTrips = await Trip.find({
      user: req.userId,
      isUpcoming: true,
      isCompleted: { $ne: true },
    })
      .sort({ tripStartDate: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments({
      user: req.userId,
      isUpcoming: true,
      isCompleted: { $ne: true },
    });

    return res.json({
      upcomingTrips,
      pagination: { current: Number(page), pages: Math.ceil(total / Number(limit)), total },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch upcoming trips', details: error.message });
  }
});

router.get('/completed', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const completedTrips = await Trip.find({
      user: req.userId,
      isCompleted: true,
    })
      .sort({ tripEndDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Trip.countDocuments({
      user: req.userId,
      isCompleted: true,
    });

    return res.json({
      completedTrips,
      pagination: { current: Number(page), pages: Math.ceil(total / Number(limit)), total },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch completed trips', details: error.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const allTrips = await Trip.find({ user: req.userId });

    const totalTrips = allTrips.length;
    const savedTrips = allTrips.filter((t) => t.isUpcoming !== true && t.isCompleted !== true).length;
    const upcomingTripsCount = allTrips.filter((t) => t.isUpcoming === true && t.isCompleted !== true).length;
    const completedTripsCount = allTrips.filter((t) => t.isCompleted === true).length;

    const completedTripsList = allTrips.filter((t) => t.isCompleted === true);
    const totalDaysTraveled = completedTripsList.reduce((sum, t) => sum + (t.totalDays || 0), 0);

    const citiesVisited = new Set<string>();
    completedTripsList.forEach((t) => t.cities?.forEach((c) => citiesVisited.add(c.name)));

    const countriesVisited = new Set<string>();
    completedTripsList.forEach((t) => t.cities?.forEach((c) => {
      const parts = c.name.split(',');
      if (parts.length > 1) countriesVisited.add(parts[parts.length - 1].trim());
    }));

    const totalActivities = allTrips.reduce((sum, t) => {
      if (!t.generatedItinerary?.days) return sum;
      return sum + t.generatedItinerary.days.reduce(
        (daySum, day) => daySum + (day.timeSlots || []).reduce(
          (slotSum, slot) => slotSum + (slot.activities || []).length, 0
        ), 0
      );
    }, 0);

    const recentTrip = completedTripsList
      .sort((a, b) => new Date(b.tripEndDate || 0).getTime() - new Date(a.tripEndDate || 0).getTime())[0];

    const nextTrip = allTrips
      .filter((t) => t.isUpcoming === true && t.isCompleted !== true)
      .sort((a, b) => new Date(a.tripStartDate || 0).getTime() - new Date(b.tripStartDate || 0).getTime())[0];

    return res.json({
      statistics: {
        totalTrips, savedTrips,
        upcomingTrips: upcomingTripsCount,
        completedTrips: completedTripsCount,
        totalDaysTraveled,
        citiesVisited: citiesVisited.size,
        countriesVisited: countriesVisited.size,
        totalActivities,
        recentTrip: recentTrip ? {
          id: recentTrip._id, title: recentTrip.title,
          cities: recentTrip.cities, endDate: recentTrip.tripEndDate,
        } : null,
        nextTrip: nextTrip ? {
          id: nextTrip._id, title: nextTrip.title,
          cities: nextTrip.cities, startDate: nextTrip.tripStartDate,
        } : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch trip statistics', details: error.message });
  }
});

router.get('/check', async (req, res) => {
  try {
    const { startDate, cities, people, travelType } = req.query;

    if (!startDate || !cities || !people || !travelType) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const existingTrip = await Trip.findOne({
      user: req.userId,
      startDate: new Date(startDate as string),
      people: parseInt(people as string),
      travelType: travelType as string,
      'cities.name': { $in: JSON.parse(cities as string).map((c: any) => c.name) },
    });

    return res.json({ isSaved: !!existingTrip, savedTrip: existingTrip });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to check trip status', details: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, user: req.userId });
    if (!trip) return res.status(404).json({ error: 'Saved trip not found' });
    return res.json(trip);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch saved trip', details: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.user;
    delete updates._id;
    delete updates.createdAt;

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!trip) return res.status(404).json({ error: 'Saved trip not found' });
    return res.json({ message: 'Trip updated successfully', savedTrip: trip });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update saved trip', details: error.message });
  }
});

router.put('/:id/upcoming', async (req, res) => {
  try {
    const { tripStartDate } = req.body;
    if (!tripStartDate) return res.status(400).json({ error: 'Trip start date is required' });

    const trip = await Trip.findOne({ _id: req.params.id, user: req.userId });
    if (!trip) return res.status(404).json({ error: 'Saved trip not found' });

    const startDate = new Date(tripStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + trip.totalDays);

    const updated = await Trip.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isUpcoming: true, isCompleted: false, tripStartDate: startDate, tripEndDate: endDate },
      { new: true, runValidators: true }
    );

    return res.json({ message: 'Trip marked as upcoming successfully', savedTrip: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to mark trip as upcoming', details: error.message });
  }
});

router.put('/:id/completed', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isCompleted: true, tripEndDate: new Date() },
      { new: true, runValidators: true }
    );

    if (!trip) return res.status(404).json({ error: 'Saved trip not found' });
    return res.json({ message: 'Trip marked as completed successfully', savedTrip: trip });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to mark trip as completed', details: error.message });
  }
});

router.delete('/:id/upcoming', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isUpcoming: false, isCompleted: false, tripStartDate: null, tripEndDate: null },
      { new: true, runValidators: true }
    );

    if (!trip) return res.status(404).json({ error: 'Saved trip not found' });
    return res.json({ message: 'Trip moved back to saved successfully', savedTrip: trip });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to remove trip from upcoming', details: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!trip) return res.status(404).json({ error: 'Saved trip not found' });
    return res.json({ message: 'Trip deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete saved trip', details: error.message });
  }
});

export default router;
