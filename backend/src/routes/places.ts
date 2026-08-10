import express from 'express';
import { placesService } from '../services/places/placesService.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const places = await placesService.searchPlaces(query.trim(), parseInt(limit as string, 10));
    return res.json(places);
  } catch (error: any) {
    console.error('Places search error:', error);
    return res.status(500).json({ error: 'Error searching places' });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const { query, limit = 8 } = req.query;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const suggestions = await placesService.getAutocomplete(query.trim(), parseInt(limit as string, 10));
    return res.json(suggestions);
  } catch (error: any) {
    console.error('Autocomplete error:', error);
    return res.status(500).json({ error: 'Error getting autocomplete suggestions' });
  }
});

export default router;
