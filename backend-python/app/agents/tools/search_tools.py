"""Search tools — search_destinations, web_search, resolve_places."""

import httpx
from langchain_core.tools import tool

from app.config import settings
from app.services.places_service import places_service
from app.services.google_places import google_places
from app.utils.logger import logger


@tool
async def search_destinations(query: str) -> str:
    """Search for travel destinations, attractions, and places of interest.
    Use this when the user asks about what to do in a place, best attractions, etc.

    Args:
        query: Search query (e.g., "best attractions in Tokyo", "things to do in Kyoto")
    """
    results = await places_service.search_places(query, limit=5)
    if not results:
        return f"No results found for '{query}'. Try a different search term."

    summaries = []
    for r in results:
        summaries.append(f"**{r['name']}** ({r['type']}): {r['description'][:150]}...")

    return f"Found {len(results)} places for '{query}':\n\n" + "\n\n".join(summaries)


@tool
async def web_search(query: str) -> str:
    """Search the web for travel information, current events, visa requirements, etc.

    Args:
        query: What to search for
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "tools": [{"type": "web_search"}],
                    "input": query,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                # Extract text from the response
                for item in data.get("output", []):
                    if item.get("type") == "message":
                        for content in item.get("content", []):
                            if content.get("type") == "output_text":
                                return content["text"][:1000]
                return "Search completed but no text content found."
            return f"Web search failed with status {resp.status_code}"
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return f"Web search failed: {e}"


@tool
async def resolve_places(place_names: list[str]) -> str:
    """Resolve place names to canonical place information with coordinates.
    Use this when you need to standardize city or destination names.

    Args:
        place_names: List of place names to resolve (e.g., ["Tokyo", "Kyoto"])
    """
    results = []
    for name in place_names:
        places = await google_places.search_places(name)
        if places:
            p = places[0]
            results.append(f"{p['name']} ({p.get('address', '')}) — lat:{p['coordinates']['lat']}, lng:{p['coordinates']['lng']}")
        else:
            results.append(f"{name}: could not resolve")

    return "\n".join(results)
