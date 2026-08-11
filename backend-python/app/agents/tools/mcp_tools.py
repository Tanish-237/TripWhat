"""MCP-powered agent tools — search_places, resolve_names, compute_routes, lookup_weather.

These tools wrap the Google Maps Grounding Lite MCP client as LangGraph @tool functions
so the agent can call them autonomously during chat.
"""

import json
from langchain_core.tools import tool

from app.services.mcp_client import maps_mcp
from app.services.places_search import places_search
from app.utils.logger import logger


@tool
async def mcp_search_places(text_query: str, city: str = "") -> str:
    """Search for real places using Google Maps — attractions, restaurants, hotels, etc.
    Use this when the user asks to add a specific place, find things to do, or search for hotels/restaurants.

    Args:
        text_query: Search query (e.g., "Senso-ji Temple Tokyo", "best restaurants in Kyoto", "hotels in Osaka")
        city: City name for caching (e.g., "Tokyo")
    """
    # Use cache-first search service (MCP → Google Places → OpenTripMap)
    results = await places_search.search(text_query, city or text_query, limit=10)

    if not results:
        return f"No places found for '{text_query}'. Try a different search term."

    summaries = []
    for r in results:
        name = r.get("name", "Unknown")
        rating = r.get("rating", "N/A")
        address = r.get("address", "")
        rtype = ", ".join(r.get("types", [])[:3]) if r.get("types") else "place"
        coords = r.get("coordinates", {})
        summaries.append(
            f"**{name}** (rating: {rating}, type: {rtype})\n"
            f"  Address: {address}\n"
            f"  Coordinates: {coords.get('lat', 0)}, {coords.get('lng', 0)}\n"
            f"  Place ID: {r.get('placeId', 'N/A')}"
        )

    return f"Found {len(results)} places for '{text_query}':\n\n" + "\n\n".join(summaries)


@tool
async def mcp_resolve_names(place_names: list[str]) -> str:
    """Resolve a batch of place names to canonical Google Maps Place IDs.
    Use this when you need to standardize place names or get Place IDs for other lookups.

    Args:
        place_names: List of place names to resolve (e.g., ["Senso-ji Temple", "Tokyo Tower"])
    """
    results = await maps_mcp.resolve_names(place_names)

    if not results:
        return f"Could not resolve any of: {place_names}"

    summaries = []
    for r in results:
        summaries.append(f"**{r['name']}** → Place ID: {r.get('placeId', 'N/A')}")

    return f"Resolved {len(results)} places:\n\n" + "\n\n".join(summaries)


@tool
async def mcp_compute_routes(origin: str, destination: str, travel_mode: str = "DRIVE") -> str:
    """Compute a travel route between two places.
    Use this when the user asks about travel time, distance, or directions between places.

    Args:
        origin: Starting point (address or place name, e.g., "Senso-ji Temple, Tokyo")
        destination: Ending point (address or place name, e.g., "Tokyo Tower")
        travel_mode: "DRIVE" or "WALK" (default: DRIVE)
    """
    result = await maps_mcp.compute_routes(
        origin={"address": origin},
        destination={"address": destination},
        travel_mode=travel_mode,
    )

    if not result:
        return f"Could not compute route from {origin} to {destination}."

    distance = result.get("distanceMeters", "N/A")
    duration = result.get("duration", "N/A")
    return f"Route from {origin} to {destination} ({travel_mode}):\nDistance: {distance}m\nDuration: {duration}"


@tool
async def mcp_lookup_weather(location: str, date: str = "") -> str:
    """Look up weather for a location.
    Use this when the user asks about weather, what to pack, or best time to visit.

    Args:
        location: Address or place name (e.g., "Tokyo, Japan")
        date: Optional date in YYYY-MM-DD format for forecast
    """
    args = {"location": {"address": location}}

    if date:
        try:
            parts = date.split("-")
            args["date"] = {"year": int(parts[0]), "month": int(parts[1]), "day": int(parts[2])}
        except (ValueError, IndexError):
            pass

    result = await maps_mcp.lookup_weather(args)

    if not result:
        return f"Could not look up weather for {location}."

    return f"Weather for {location}:\n{json.dumps(result, indent=2)[:500]}"
