"""Memory tools — let the agent save long-term user preferences."""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.services.memory import remember_preference


@tool
async def remember_user_preference(preference: str, config: RunnableConfig) -> str:
    """Save a long-term user preference or profile fact that will be useful across future trips.
    Call this when the user reveals a durable preference — home airport/city, budget style,
    dietary restrictions, preferred airlines, hotel chains, activity types they dislike, etc.
    Do NOT use this for trip-specific details (dates, destinations, group size) — those go in trip slots.

    Args:
        preference: A concise description of the preference (e.g., "home_city: San Francisco", "dietary: vegetarian", "prefers boutique hotels")
    """
    user_id = (config.get("configurable") or {}).get("user_id")
    if not user_id:
        return "No user context available; preference not saved."
    saved = await remember_preference(user_id, preference)
    return "Preference saved for future trips." if saved else "Could not save the preference."
