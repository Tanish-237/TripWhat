"""Itinerary tools — build_itinerary and edit_itinerary."""

import json
from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState
from langgraph.config import get_stream_writer
from typing import Annotated

from app.services.itinerary_builder import itinerary_builder
from app.services.itinerary_editor import itinerary_editor
from app.utils.logger import logger


@tool
async def build_itinerary(state: Annotated[dict, InjectedState]) -> str:
    """Build a complete itinerary from the current trip state.
    Call this when the user confirms the route proposal.
    Returns a day-by-day itinerary with time slots for activities.
    """
    trip_state = state.get("trip_state") or {}
    cities = trip_state.get("cities", [])
    route_proposal = trip_state.get("routeProposal")

    if route_proposal and route_proposal.get("cities"):
        build_cities = [
            {"name": c["name"], "days": c["nights"]}
            for c in route_proposal["cities"]
        ]
    elif cities:
        total_nights = sum(c.get("nights", 1) for c in cities)
        build_cities = [
            {"name": c["name"], "days": c.get("nights", 1)}
            for c in cities
        ]
    else:
        return "Cannot build itinerary: no cities in trip state."

    ctx = {
        "destination": build_cities[0]["name"],
        "duration": sum(c["days"] for c in build_cities),
        "cities": build_cities,
        "totalDays": sum(c["days"] for c in build_cities),
        "travelType": trip_state.get("pace", "moderate"),
        "numberOfPeople": (trip_state.get("travelers") or {}).get("adults", 1),
        "preferences": trip_state.get("preferences", []),
        "tripStyle": trip_state.get("tripStyle", "balanced"),
    }

    dates = trip_state.get("dates")
    if dates and dates.get("start"):
        ctx["startDate"] = dates["start"]

    # Emit progress events via stream writer
    try:
        writer = get_stream_writer()
        writer({"status": f"Building {len(build_cities)} cities..."})
        for c in build_cities:
            writer({"status": f"Searching places in {c['name']}..."})
    except Exception:
        pass  # No stream context (non-streaming caller)

    result = await itinerary_builder.build(ctx)
    if not result:
        return "Failed to build itinerary."

    itinerary = result["itinerary"]
    logger.info(f"[BUILD_ITINERARY] Built itinerary with {len(itinerary.get('days', []))} days")

    # Emit completion progress
    try:
        writer = get_stream_writer()
        writer({"status": f"Itinerary built: {len(itinerary.get('days', []))} days"})
    except Exception:
        pass

    return (
        f"Itinerary built successfully!\n"
        f"Days: {len(itinerary.get('days', []))}\n"
        f"Cities: {', '.join(c['name'] for c in build_cities)}\n\n"
        f"Itinerary data: {json.dumps(itinerary)}"
    )


@tool
async def edit_itinerary(
    action_type: str,
    day: int | None = None,
    time_slot: str | None = None,
    activity_name: str | None = None,
    activity_id: str | None = None,
    place_name: str | None = None,
    new_day: int | None = None,
    new_time_slot: str | None = None,
    state: Annotated[dict, InjectedState] = None,
) -> str:
    """Edit an existing itinerary by adding, removing, replacing, or moving activities.

    Args:
        action_type: One of 'add', 'remove', 'replace', 'move', 'add_day', 'remove_day'
        day: Target day number (1-indexed)
        time_slot: Target time slot ('morning', 'afternoon', 'evening')
        activity_name: Name of the activity to add/remove/replace
        activity_id: ID of the activity to remove/move
        place_name: Place name for add/replace operations
        new_day: Destination day for move operations
        new_time_slot: Destination time slot for move operations
    """
    trip_state = state.get("trip_state") or {}
    itinerary = trip_state.get("itinerary")

    if not itinerary:
        return "No itinerary found. Build an itinerary first."

    action = {
        "type": action_type,
        "target": {
            "day": day,
            "timeSlot": time_slot,
            "activityName": activity_name,
            "activityId": activity_id,
        },
        "details": {
            "placeName": place_name or activity_name,
            "newDay": new_day,
            "newTimeSlot": new_time_slot,
        },
    }

    destination = (trip_state.get("cities") or [{}])[0].get("name", "the destination")

    try:
        if action_type == "add":
            result = await itinerary_editor.add_activity(itinerary, action, destination)
        elif action_type == "remove":
            result = itinerary_editor.remove_activity(itinerary, action)
        elif action_type == "replace":
            result = await itinerary_editor.replace_activity(itinerary, action, destination)
        elif action_type == "move":
            result = itinerary_editor.move_activity(itinerary, action)
        elif action_type == "add_day":
            result = itinerary_editor.add_day(itinerary)
        elif action_type == "remove_day":
            result = itinerary_editor.remove_day(itinerary, day or 1)
        else:
            return f"Unknown action type: {action_type}"

        logger.info(f"[EDIT_ITINERARY] {action_type}: {result['message']}")
        return f"{result['message']}\n\nUpdated itinerary: {json.dumps(result['itinerary'])}"
    except Exception as e:
        logger.error(f"[EDIT_ITINERARY] Error: {e}")
        return f"Failed to edit itinerary: {e}"
