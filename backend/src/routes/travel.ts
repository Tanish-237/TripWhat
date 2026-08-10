import express from 'express';
import { travelMeansService } from '../services/travelMeansService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/means', authenticateToken, async (req, res) => {
  try {
    const { startLocation, cities, startDate, totalDays, passengers, preferences } = req.body;

    if (!startLocation || !cities || !Array.isArray(cities) || cities.length === 0 || !startDate || !totalDays || !passengers) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: startLocation, cities (array), startDate, totalDays, passengers',
      });
    }

    const travelMeans = await travelMeansService.calculateTravelMeans({
      startLocation,
      cities,
      startDate: new Date(startDate),
      totalDays: parseInt(totalDays),
      passengers: parseInt(passengers),
      preferences,
    });

    return res.json({ success: true, data: travelMeans });
  } catch (error) {
    console.error('Error calculating travel means:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate travel means',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/route', authenticateToken, async (req, res) => {
  try {
    const { from, to, departureDate, passengers, preferences } = req.body;

    if (!from || !to || !departureDate || !passengers) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: from, to, departureDate, passengers',
      });
    }

    const route = await travelMeansService.getTravelMeansForRoute(
      from,
      to,
      new Date(departureDate),
      parseInt(passengers),
      preferences
    );

    return res.json({ success: true, data: route });
  } catch (error) {
    console.error('Error getting travel route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get travel route',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/recommendations', authenticateToken, async (req, res) => {
  try {
    const { routes } = req.body;

    if (!routes || !Array.isArray(routes)) {
      return res.status(400).json({
        success: false,
        message: 'Routes array is required',
      });
    }

    const recommendations = [
      {
        type: 'COST_EFFECTIVE',
        routeIndices: [0, 1],
        description: 'Most budget-friendly options',
        estimatedSavings: 150,
      },
    ];

    return res.json({ success: true, data: { recommendations } });
  } catch (error) {
    console.error('Error generating travel recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
