import express from 'express';
import { TravelAgent } from '../agents/travel-agent.js';
import type { TripContext } from '../types/tripContext.js';

const router = express.Router();

/**
 * POST /api/itinerary/generate
 * Generate AI itinerary from structured trip data
 */
router.post('/generate', async (req, res) => {
  try {
    const tripContext: TripContext = req.body;

    // Validate required fields
    if (!tripContext.cities || tripContext.cities.length === 0) {
      return res.status(400).json({ 
        error: 'At least one destination is required' 
      });
    }

    if (!tripContext.startDate) {
      return res.status(400).json({ 
        error: 'Start date is required' 
      });
    }

    if (!tripContext.budget || !tripContext.budget.total) {
      return res.status(400).json({ 
        error: 'Budget information is required' 
      });
    }

    if (!tripContext.people || tripContext.people < 1) {
      return res.status(400).json({ 
        error: 'Number of travelers is required' 
      });
    }

    if (!tripContext.travelType) {
      return res.status(400).json({ 
        error: 'Travel type is required' 
      });
    }

    console.log('📋 Generating itinerary with context:', {
      origin: tripContext.origin || 'NOT SET',
      cities: tripContext.cities.map(c => `${c.name} (${c.days}d)`),
      budget: `$${tripContext.budget.total} (${tripContext.budgetMode})`,
      people: tripContext.people,
      travelType: tripContext.travelType,
      startDate: tripContext.startDate
    });

    // Create travel agent instance
    const agent = new TravelAgent();

    // Generate itinerary with context
    const result = await agent.generateItineraryWithContext(tripContext);

    if (result.error) {
      return res.status(500).json({ 
        error: result.error 
      });
    }

    // Return both markdown and structured itinerary
    res.json({
      success: true,
      markdown: result.response,
      itinerary: result.itinerary,
      context: tripContext
    });

  } catch (error: any) {
    console.error('❌ Error generating itinerary:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate itinerary' 
    });
  }
});

/**
 * POST /api/itinerary/refine
 * Refine existing itinerary based on user feedback
 */
router.post('/refine', async (req, res) => {
  try {
    const { itinerary, refinementRequest, tripContext } = req.body;

    if (!itinerary || !refinementRequest) {
      return res.status(400).json({ 
        error: 'Itinerary and refinement request are required' 
      });
    }

    console.log('🔄 Refining itinerary:', refinementRequest);

    const agent = new TravelAgent();
    
    // TODO: Implement refinement logic
    // For now, regenerate with the refinement as additional context
    const result = await agent.chat(
      `Based on this itinerary:\n${JSON.stringify(itinerary, null, 2)}\n\nPlease: ${refinementRequest}`,
      undefined
    );

    res.json({
      success: true,
      response: result.response,
      itinerary: result.itinerary
    });

  } catch (error: any) {
    console.error('❌ Error refining itinerary:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to refine itinerary' 
    });
  }
});

export default router;
