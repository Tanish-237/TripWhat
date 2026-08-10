import express from 'express';
import jwt from 'jsonwebtoken';
import { calendarService } from '../services/calendar/calendarService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/oauth/url', authenticateToken, (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const jwtToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!jwtToken) {
      return res.status(400).json({ error: 'Missing bearer token' });
    }

    const url = calendarService.getOAuthUrl(jwtToken);
    return res.json({ url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/oauth/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const state = req.query.state;
    if (!state) return res.status(400).json({ error: 'Missing state' });

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET not configured' });

    let userId: string;
    try {
      const payload: any = jwt.verify(state as string, JWT_SECRET);
      userId = payload.sub || payload.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid state token' });
    }

    await calendarService.exchangeCodeAndStoreTokens(code as string, userId);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(302, `${frontendUrl}/trips?gcal=connected`);
  } catch (err: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(302, `${frontendUrl}/trips?gcal=error&reason=${encodeURIComponent(err.message || 'unknown')}`);
  }
});

router.get('/calendar/upcoming', authenticateToken, async (req, res) => {
  try {
    const events = await calendarService.listUpcomingEvents(req.userId);
    return res.json({ events });
  } catch (err: any) {
    if (err.message === 'Google not connected') {
      return res.status(401).json({ error: 'Google not connected' });
    }
    return res.status(500).json({ error: err.message });
  }
});

router.post('/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { summary, description, location, start, end, timeZone } = req.body;

    if (!summary || !start || !end) {
      return res.status(400).json({ error: 'summary, start, and end are required' });
    }

    const event = await calendarService.createEvent(req.userId, {
      summary,
      description,
      location,
      start,
      end,
      timeZone,
    });

    return res.status(201).json({ event });
  } catch (err: any) {
    if (err.message === 'Google not connected') {
      return res.status(401).json({ error: 'Google not connected' });
    }
    return res.status(500).json({ error: err.message });
  }
});

export default router;
