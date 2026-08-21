"""Slot tools — fill_trip_slot and check_trip_status.

Uses InjectedState to read agent state natively, and Command(update=...) to
write trip_state back to graph state. This fixes the state persistence bug
that plagued the JS deep agent.
"""

from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.prebuilt import InjectedState
from langgraph.types import Command
from typing import Annotated, Any

from app.agents.state import check_slots, apply_slot_answer, create_default_trip_state
from app.utils.logger import logger


@tool
def check_trip_status(state: Annotated[dict, InjectedState]) -> str:
    """Check the current trip planning status. Call this FIRST to understand where the user is in the flow.
    Returns which slots are filled, which are missing, and what question to ask next."""
    trip_state = state.get("trip_state")
    result = check_slots(trip_state)

    # If itinerary already exists, the user is in post-build mode — they can
    # edit, ask questions, or search. Don't block on missing conditional slots.
    itinerary = (trip_state or {}).get("itinerary")
    if itinerary:
        return (
            "All core slots filled. Itinerary has been built. "
            "The user may want to edit the itinerary (add/remove/replace activities), "
            "ask questions, search for places, or modify trip parameters. "
            "Handle their request directly — do NOT ask about missing conditional slots."
        )

    if result["proceed"]:
        route_proposal = (trip_state or {}).get("routeProposal")
        if route_proposal:
            return "All slots filled. Route has been proposed but not yet confirmed. Wait for user confirmation, then call build_itinerary."
        else:
            return "All slots filled. Call propose_route to generate a route proposal."
    else:
        next_slot = result["missingSlots"][0]
        question = result["questions"][0]
        return (
            f"Slots filled: {result['filledSlots']}. "
            f"Missing slots: {result['missingSlots']}. "
            f"Next slot to fill: '{next_slot}'. "
            f"Ask the user: \"{question['question']}\""
        )


@tool
def fill_trip_slot(
    slot: str,
    value: Any,
    state: Annotated[dict, InjectedState],
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Fill a trip planning slot with a value.

    Args:
        slot: One of 'destination', 'dates', 'duration', 'travelers', 'trip_style', 'help_with', 'budget', 'pace'
        value: The parsed value for this slot (e.g., "Tokyo" for destination, 14 for duration, "solo" for travelers, "culture" for trip_style, "you_decide" if user wants AI to decide)

    Call this when the user's message answers a slot question. Parse natural language into the correct value format.
    If the user says "you decide", "not sure", "whatever you think", pass "you_decide" as the value.
    """
    trip_state = state.get("trip_state") or {}

    # Apply the slot answer to get the new state.
    new_state = apply_slot_answer(trip_state, slot, value)

    logger.info(f"[FILL_SLOT] Filled {slot}={value}, state version={new_state.get('version')}")

    # Compute the delta — only the fields that changed.
    # Use the normalized baseline (what apply_slot_answer would produce with
    # no changes) so we don't include fields that were just defaulted.
    # This is critical for parallel tool calls: when the agent calls fill_trip_slot
    # multiple times in one turn, each returns only its delta, and the merge reducer
    # in state_schema.py combines them without overwriting each other.
    baseline = create_default_trip_state() if not trip_state else trip_state
    delta = {}
    for k, v in new_state.items():
        if k == "onboarding":
            # Always include onboarding — the merge reducer unions slotsFilled
            delta[k] = v
        elif baseline.get(k) != v:
            delta[k] = v

    # Check what's next
    result = check_slots(new_state)
    if result["proceed"]:
        tool_msg = f"Slot '{slot}' filled with value '{value}'. All required slots are now filled! Ready to propose a route."
    else:
        next_q = result["questions"][0]
        tool_msg = f"Slot '{slot}' filled with value '{value}'. Next, ask: \"{next_q['question']}\""

    # Write only the delta back to graph state via Command.
    return Command(
        update={
            "trip_state": delta,
            "messages": [ToolMessage(content=tool_msg, tool_call_id=tool_call_id)],
        }
    )
