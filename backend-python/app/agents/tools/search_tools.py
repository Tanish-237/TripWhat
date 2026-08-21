"""Search tools — search_destinations, web_search, resolve_places."""

from langchain_core.tools import tool
from langchain_tavily import TavilySearch

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
    if not settings.tavily_api_key:
        return "Web search unavailable: Tavily API key not configured."

    try:
        tavily = TavilySearch(
            max_results=5,
            search_depth="basic",
            include_answer=True,
            tavily_api_key=settings.tavily_api_key,
        )
        result = await tavily.ainvoke(query)

        # TavilySearch returns a list of content blocks or a dict
        if isinstance(result, list):
            parts = []
            for block in result:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block["text"])
                elif isinstance(block, str):
                    parts.append(block)
            return "\n\n".join(parts)[:2000] if parts else str(result)[:2000]
        elif isinstance(result, dict):
            answer = result.get("answer", "")
            results_list = result.get("results", [])
            parts = []
            if answer:
                parts.append(answer)
            for r in results_list[:5]:
                parts.append(f"**{r.get('title', '')}**: {r.get('content', '')[:200]}")
            return "\n\n".join(parts)[:2000] if parts else str(result)[:2000]
        else:
            return str(result)[:2000]
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
