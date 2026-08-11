"""Slot tools — fill_trip_slot and check_trip_status.

Uses InjectedState to read/write agent state natively — this fixes the
state persistence bug that plagued the JS deep agent.
"""

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState
from langgraph.graph.message import MessagesState
from typing import Annotated, Any

from app.agents.state import check_slots, apply_slot_answer, SLOT_QUESTIONS
from app.utils.logger import logger


@tool
def check_trip_status(state: Annotated[dict, InjectedState]) -> str:
    """Check the current trip planning status. Call this FIRST to understand where the user is in the flow.
    Returns which slots are filled, which are missing, and what question to ask next."""
    trip_state = state.get("trip_state")
    result = check_slots(trip_state)

    if result["proceed"]:
        route_proposal = (trip_state or {}).get("routeProposal")
        itinerary = (trip_state or {}).get("itinerary")
        if itinerary:
            return "All slots filled. Itinerary has been built. The user may want to edit it or ask questions."
        elif route_proposal:
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
) -> str:
    """Fill a trip planning slot with a value.

    Args:
        slot: One of 'destination', 'dates', 'duration', 'travelers', 'trip_style', 'help_with', 'budget', 'pace'
        value: The parsed value for this slot (e.g., "Tokyo" for destination, 14 for duration, "solo" for travelers, "culture" for trip_style, "you_decide" if user wants AI to decide)

    Call this when the user's message answers a slot question. Parse natural language into the correct value format.
    If the user says "you decide", "not sure", "whatever you think", pass "you_decide" as the value.
    """
    trip_state = state.get("trip_state") or {}

    # Apply the slot answer
    new_state = apply_slot_answer(trip_state, slot, value)

    # Store back to state — this is the key: we write to the graph state
    logger.info(f"[FILL_SLOT] Filled {slot}={value}, state version={new_state.get('version')}")

    # Check what's next
    result = check_slots(new_state)
    if result["proceed"]:
        return f"Slot '{slot}' filled with value '{value}'. All required slots are now filled! Ready to propose a route. Updated trip state: {new_state}"
    else:
        next_slot = result["missingSlots"][0]
        next_q = result["questions"][0]
        return f"Slot '{slot}' filled with value '{value}'. Next, ask: \"{next_q['question']}\". Updated trip state: {new_state}"
