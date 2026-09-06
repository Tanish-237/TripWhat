"""Itinerary tools — build_itinerary and edit_itinerary."""

from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.prebuilt import InjectedState
from langgraph.config import get_stream_writer
from langgraph.types import Command
from typing import Annotated

from app.services.itinerary_builder import itinerary_builder
from app.services.itinerary_editor import itinerary_editor
from app.utils.logger import logger


@tool
async def build_itinerary(
    state: Annotated[dict, InjectedState],
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Build a complete day-by-day itinerary from the current trip state.
    Call this immediately after the user confirms the route proposal.
    Searches for real places (hotels, restaurants, attractions) and assembles
    a day-by-day plan with time slots. No arguments needed — reads from trip state.
    """
    trip_state = state.get("trip_state") or {}
    cities = trip_state.get("cities", [])
    route_proposal = trip_state.get("routeProposal")

    if route_proposal and route_proposal.get("cities"):
        build_cities = []
        for i, c in enumerate(route_proposal["cities"]):
            days = c["nights"] + 1 if i == 0 else c["nights"]
            build_cities.append({"name": c["name"], "days": days})
    elif cities:
        build_cities = []
        for i, c in enumerate(cities):
            nights = c.get("nights", 1)
            days = nights + 1 if i == 0 else nights
            build_cities.append({"name": c["name"], "days": days})
    else:
        return Command(
            update={
                "messages": [ToolMessage(content="Cannot build itinerary: no cities in trip state.", tool_call_id=tool_call_id)],
            }
        )

    ctx = {
        "destination": build_cities[0]["name"],
        "duration": sum(c["days"] for c in build_cities),
        "cities": build_cities,
        "totalDays": sum(c["days"] for c in build_cities),
        "travelType": trip_state.get("pace", "moderate"),
        "numberOfPeople": (trip_state.get("travelers") or {}).get("adults", 1),
        "preferences": trip_state.get("preferences", []),
        "tripStyle": trip_state.get("tripStyle", "balanced"),
        "helpWith": trip_state.get("helpWith", []),
    }

    # Pass startLocation for flight search if available
    start_location = trip_state.get("startLocation")
    if start_location:
        ctx["startLocation"] = start_location

    dates = trip_state.get("dates")
    if dates and dates.get("start"):
        ctx["startDate"] = dates["start"]

    travel_mode = trip_state.get("travelMode")
    if travel_mode:
        ctx["travelMode"] = travel_mode

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
        return Command(
            update={
                "messages": [ToolMessage(content="Failed to build itinerary.", tool_call_id=tool_call_id)],
            }
        )

    itinerary = result["itinerary"]
    logger.info(f"[BUILD_ITINERARY] Built itinerary with {len(itinerary.get('days', []))} days")

    # Emit completion progress
    try:
        writer = get_stream_writer()
        writer({"status": f"Itinerary built: {len(itinerary.get('days', []))} days"})
    except Exception:
        pass

    # Write itinerary to trip_state and return a ToolMessage for the LLM
    new_trip_state = dict(trip_state)
    new_trip_state["itinerary"] = itinerary

    tool_msg = (
        f"Itinerary built successfully!\n"
        f"Days: {len(itinerary.get('days', []))}\n"
        f"Cities: {', '.join(c['name'] for c in build_cities)}"
    )

    return Command(
        update={
            "trip_state": new_trip_state,
            "messages": [ToolMessage(content=tool_msg, tool_call_id=tool_call_id)],
        }
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
    tool_call_id: Annotated[str, InjectedToolCallId] = None,
) -> Command:
    """Edit an existing itinerary by adding, removing, replacing, or moving activities.
    Only call this when an itinerary already exists.

    Args:
        action_type: What to do — 'add', 'remove', 'replace', 'move', 'add_day', 'remove_day'
        day: Target day number (1-indexed). Required for most actions.
        time_slot: Target time slot — 'morning', 'afternoon', or 'evening'
        activity_name: Name of the activity (for add/remove/replace)
        activity_id: ID of the activity (for remove/move — use if you have it)
        place_name: Real place name to add/replace (e.g., "Senso-ji Temple"). Search with mcp_search_places first.
        new_day: Destination day number for move operations
        new_time_slot: Destination time slot for move operations
    """
    trip_state = state.get("trip_state") or {}
    itinerary = trip_state.get("itinerary")

    if not itinerary:
        return Command(
            update={
                "messages": [ToolMessage(content="No itinerary found. Build an itinerary first.", tool_call_id=tool_call_id)],
            }
        )

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
            return Command(
                update={
                    "messages": [ToolMessage(content=f"Unknown action type: {action_type}", tool_call_id=tool_call_id)],
                }
            )

        logger.info(f"[EDIT_ITINERARY] {action_type}: {result['message']}")

        # Write updated itinerary to trip_state
        new_trip_state = dict(trip_state)
        new_trip_state["itinerary"] = result["itinerary"]

        return Command(
            update={
                "trip_state": new_trip_state,
                "messages": [ToolMessage(content=result["message"], tool_call_id=tool_call_id)],
            }
        )
    except Exception as e:
        logger.error(f"[EDIT_ITINERARY] Error: {e}")
        return Command(
            update={
                "messages": [ToolMessage(content=f"Failed to edit itinerary: {e}", tool_call_id=tool_call_id)],
            }
        )
