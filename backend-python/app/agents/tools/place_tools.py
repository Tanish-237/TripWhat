"""Place tools — get_place_details, find_nearby_attractions."""

from langchain_core.tools import tool

from app.services.google_places import google_places


@tool
async def get_place_details(place_id: str) -> str:
    """Get detailed information about a specific place using its Google Place ID.

    Args:
        place_id: Google Places place_id
    """
    details = await google_places.get_place_details(place_id)
    if not details:
        return f"Could not find details for place_id: {place_id}"

    name = details.get("name", "Unknown")
    address = details.get("formatted_address", "")
    rating = details.get("rating", "N/A")
    website = details.get("website", "")
    phone = details.get("formatted_phone_number", "")
    hours = details.get("opening_hours", {}).get("weekday_text", [])

    result = f"**{name}**\nAddress: {address}\nRating: {rating}"
    if phone:
        result += f"\nPhone: {phone}"
    if website:
        result += f"\nWebsite: {website}"
    if hours:
        result += "\nHours:\n" + "\n".join(hours)

    return result


@tool
async def find_nearby_attractions(lat: float, lng: float, radius: int = 5000) -> str:
    """Find tourist attractions near a specific location.

    Args:
        lat: Latitude of the location
        lng: Longitude of the location
        radius: Search radius in meters (default 5000)
    """
    results = await google_places.find_nearby(lat, lng, radius, "tourist_attraction")
    if not results:
        return "No nearby attractions found."

    summaries = []
    for r in results[:10]:
        summaries.append(f"**{r['name']}** (rating: {r.get('rating', 'N/A')}) — {r.get('address', '')}")

    return f"Found {len(results)} nearby attractions:\n\n" + "\n\n".join(summaries)
