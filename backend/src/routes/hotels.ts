import express from 'express';
import { getHotelProvider } from '../services/inventory';
import { HotelQuerySchema } from '../services/inventory/types';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const {
      destination,
      checkIn,
      checkOut,
      adults = '2',
      children = '0',
      minPrice,
      maxPrice,
      currency = 'USD',
      sort = 'relevance',
    } = req.query;

    if (!destination || !checkIn || !checkOut) {
      return res.status(400).json({
        error: 'Missing required parameters: destination, checkIn, checkOut',
      });
    }

    const provider = getHotelProvider();
    const query = HotelQuerySchema.parse({
      destination: destination as string,
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      adults: parseInt(adults as string),
      children: parseInt(children as string),
      minPrice: minPrice ? parseInt(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      currency: currency as string,
      sort: sort as string,
    });

    const hotels = await provider.search(query);

    return res.json({
      success: true,
      count: hotels.length,
      hotels,
    });
  } catch (error: any) {
    console.error('Hotel search error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to search hotels',
    });
  }
});

export default router;
