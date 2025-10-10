import { Router } from 'express';
import {
  getFlightOffers,
  getHotelOffers,
  getEvents,
  getWeatherForecast,
  getRestaurants,
} from '../controllers/travelDataController.js';
import auth from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.get('/flights', auth, getFlightOffers);
router.get('/hotels', auth, getHotelOffers);
router.get('/events', auth, getEvents);
router.get('/weather', auth, getWeatherForecast);
router.get('/restaurants', auth, getRestaurants);

export default router;
