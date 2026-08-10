import express from 'express';
import { getFlightProvider } from '../services/inventory';
import { FlightQuerySchema } from '../services/inventory/types';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = '1',
      children = '0',
      travelClass = 'economy',
      maxPrice,
      currency = 'USD',
      deepSearch = 'false',
    } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination, departureDate',
      });
    }

    const provider = getFlightProvider();
    const query = FlightQuerySchema.parse({
      origin: origin as string,
      destination: destination as string,
      departureDate: departureDate as string,
      returnDate: returnDate as string | undefined,
      adults: parseInt(adults as string),
      children: parseInt(children as string),
      travelClass: travelClass as string,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      currency: currency as string,
      deepSearch: deepSearch === 'true',
    });

    const flights = await provider.searchOffers(query);

    return res.json({
      success: true,
      count: flights.length,
      flights,
    });
  } catch (error: any) {
    console.error('Flight search error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to search flights',
    });
  }
});

router.get('/best', async (req, res) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      adults = '1',
      children = '0',
      travelClass = 'economy',
      currency = 'USD',
    } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Missing required parameters: origin, destination, departureDate',
      });
    }

    const provider = getFlightProvider();
    const query = FlightQuerySchema.parse({
      origin: origin as string,
      destination: destination as string,
      departureDate: departureDate as string,
      returnDate: returnDate as string | undefined,
      adults: parseInt(adults as string),
      children: parseInt(children as string),
      travelClass: travelClass as string,
      currency: currency as string,
    });

    const flights = await provider.searchOffers(query);
    const bestFlight = flights.find((f) => f.isBest) || flights[0];

    if (!bestFlight) {
      return res.status(404).json({
        error: 'No flights found',
      });
    }

    return res.json({
      success: true,
      flight: bestFlight,
    });
  } catch (error: any) {
    console.error('Best flight error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to find best flight',
    });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const { term } = req.query;

    if (!term) {
      return res.status(400).json({
        error: 'Missing required parameter: term',
      });
    }

    const provider = getFlightProvider();
    const suggestions = await provider.autocomplete(term as string);

    return res.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error('Autocomplete error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to autocomplete',
    });
  }
});

export default router;
