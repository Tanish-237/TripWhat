import express from "express";
import { searchPlaces, getLocationAutocomplete } from "../services/placesService.js";

const router = express.Router();

// Search places by query string
router.get("/search", async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ message: "Query parameter is required" });
    }
    
    const places = await searchPlaces(query.trim());
    // Limit results if specified
    const limitedResults = limit ? places.slice(0, parseInt(limit, 10)) : places;
    res.json(limitedResults);
  } catch (error) {
    console.error("Places search error:", error);
    res.status(500).json({ message: "Error searching places" });
  }
});

// Autocomplete endpoint for location suggestions
router.get("/autocomplete", async (req, res) => {
  try {
    const { query, limit = 8 } = req.query;
    
    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ message: "Query parameter is required" });
    }
    
    const suggestions = await getLocationAutocomplete(query.trim(), parseInt(limit, 10));
    res.json(suggestions);
  } catch (error) {
    console.error("Autocomplete error:", error);
    res.status(500).json({ message: "Error getting autocomplete suggestions" });
  }
});

export default router;