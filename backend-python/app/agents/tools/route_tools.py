"""Route tools — propose_route using LLM to generate city-by-city night splits."""

from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.prebuilt import InjectedState
from langgraph.types import interrupt, Command
from langchain_openai import ChatOpenAI
from typing import Annotated
import json

from app.utils.logger import logger


@tool
async def propose_route(
    state: Annotated[dict, InjectedState],
    tool_call_id: Annotated[str, InjectedToolCallId],
    preferences: str = "",
) -> Command:
    """Propose a route with city-by-city night splits based on the current trip state.
    Call this once all required slots (destination, dates, duration, travelers) are filled.
    Returns a route proposal with cities, nights per city, and rationale.

    Args:
        preferences: Optional user preferences for the route (e.g., "5 nights in Tokyo, 1 in Osaka").
                     Pass this when re-proposing after a user rejection.
    """
    trip_state = state.get("trip_state") or {}
    cities = trip_state.get("cities", [])

    # Calculate total nights: prefer sum of city nights, fall back to duration field.
    duration = sum(c.get("nights", 0) for c in cities)
    if duration == 0:
        duration = trip_state.get("duration", 0)
    total_nights = max(1, duration - 1) if duration > 1 else 1

    if not cities:
        return Command(
            update={
                "messages": [ToolMessage(content="Cannot propose route: no cities in trip state.", tool_call_id=tool_call_id)],
            }
        )

    city_names = [c["name"] for c in cities]

    # Check if we already have a proposal — when resuming from interrupt,
    # the tool is re-executed from the beginning. Skip the LLM call if
    # we already generated a proposal.
    # Check if we already have a proposal — when resuming from interrupt,
    # the tool is re-executed from the beginning. Skip the LLM call if
    # we already generated a proposal AND no new preferences were given.
    existing_proposal = trip_state.get("routeProposal")
    if existing_proposal and existing_proposal.get("cities") and not preferences:
        proposal = existing_proposal
    else:
        # Use LLM to propose night splits
        model = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            # Force the API to return valid JSON — prevents unquoted keys,
            # trailing commas, and other common LLM JSON mistakes.
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        prefs_line = f"\nUser preferences: {preferences}\n" if preferences else ""
        prompt = f"""\
You are a travel route planner. Given these cities: {city_names}
Total nights available: {total_nights}{prefs_line}

Propose a route with night splits per city. Consider:
- Logical geographic order (minimize travel time)
- Popular cities deserve more nights
- First and last cities may need fewer nights (arrival/departure)
- If user preferences are specified, follow them as closely as possible

Respond with ONLY a JSON object with this exact structure:
{{
  "cities": [{{"name": "CityName", "nights": N, "order": 0}}],
  "totalNights": {total_nights},
  "rationale": "Brief explanation of the route"
}}
"""
        try:
            response = await model.ainvoke([{"role": "user", "content": prompt}])
            content = response.content if isinstance(response.content, str) else str(response.content)

            import re
            # Strip markdown code fences (```json ... ```) if present
            content = re.sub(r"^```(?:json)?\s*", "", content.strip())
            content = re.sub(r"\s*```\s*$", "", content)
            json_match = re.search(r"\{[\s\S]*\}", content)
            if json_match:
                raw_json = json_match.group()
                try:
                    proposal = json.loads(raw_json)
                except json.JSONDecodeError:
                    # Repair common LLM JSON mistakes: unquoted keys,
                    # single quotes, trailing commas
                    repaired = raw_json
                    repaired = re.sub(r"([{,]\s*)([a-zA-Z_]\w*)\s*:", r'\1"\2":', repaired)
                    repaired = repaired.replace("'", '"')
                    repaired = re.sub(r",\s*([}\]])", r"\1", repaired)
                    try:
                        proposal = json.loads(repaired)
                        logger.info("[PROPOSE_ROUTE] JSON repaired successfully")
                    except json.JSONDecodeError:
                        raise ValueError(f"Could not parse JSON even after repair: {raw_json[:200]}")
            else:
                # Fallback: even split
                nights_per = max(1, total_nights // len(cities))
                proposal = {
                    "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                    "totalNights": total_nights,
                    "rationale": f"Even split of {nights_per} nights per city.",
                }
        except Exception as e:
            logger.error(f"Route proposal LLM failed: {e}")
            nights_per = max(1, total_nights // len(cities))
            proposal = {
                "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                "totalNights": total_nights,
                "rationale": f"Even split of {nights_per} nights per city.",
            }

        # Validate the proposal has the expected structure
        if not isinstance(proposal, dict) or not proposal.get("cities") or not isinstance(proposal["cities"], list):
            logger.warning(f"[PROPOSE_ROUTE] Invalid proposal structure, using fallback")
            nights_per = max(1, total_nights // len(cities))
            proposal = {
                "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                "totalNights": total_nights,
                "rationale": f"Even split of {nights_per} nights per city.",
            }
        else:
            # Ensure totalNights matches the sum of city nights
            actual_nights = sum(c.get("nights", 0) for c in proposal["cities"])
            if actual_nights != total_nights:
                logger.info(f"[PROPOSE_ROUTE] Adjusting totalNights from {proposal.get('totalNights')} to {actual_nights}")
                proposal["totalNights"] = actual_nights

        logger.info(f"[PROPOSE_ROUTE] Proposal: {json.dumps(proposal)}")

    # Human-in-the-loop: pause for route confirmation.
    # The interrupt value includes the proposal so the frontend can display it.
    # On resume, interrupt() returns the user's decision.
    user_decision = interrupt({
        "type": "route_confirmation",
        "proposal": proposal,
        "message": f"Route proposed: {' → '.join(c['name'] for c in proposal['cities'])}. "
                   f"Total: {proposal['totalNights']} nights. Confirm?",
    })

    # user_decision is the resume value from Command(resume=...)
    if isinstance(user_decision, dict) and user_decision.get("confirmed"):
        logger.info("[PROPOSE_ROUTE] Route confirmed by user")
        # Write routeProposal to trip_state and tell the LLM to build itinerary
        new_trip_state = dict(trip_state)
        new_trip_state["routeProposal"] = proposal

        city_strs = [f"{c['name']} ({c['nights']} nights)" for c in proposal["cities"]]
        tool_msg = (
            f"Route confirmed by user! Route: {' → '.join(city_strs)}\n"
            f"Total: {proposal['totalNights']} nights\n"
            f"The route is confirmed. You MUST call build_itinerary NOW to generate "
            f"the detailed itinerary. Do NOT ask the user if they want to build it — "
            f"just call build_itinerary immediately."
        )

        return Command(
            update={
                "trip_state": new_trip_state,
                "messages": [ToolMessage(content=tool_msg, tool_call_id=tool_call_id)],
            }
        )
    else:
        logger.info("[PROPOSE_ROUTE] Route rejected or modified by user")
        rejection_msg = user_decision.get("message", "") if isinstance(user_decision, dict) else str(user_decision)
        tool_msg = (
            f"Route rejected by user. User said: {rejection_msg}\n"
            f"Call propose_route again immediately with preferences=\"{rejection_msg}\" "
            f"to generate a new route that matches the user's request. Do NOT ask "
            f"the user what they want — they already told you."
        )
        return Command(
            update={
                "messages": [ToolMessage(content=tool_msg, tool_call_id=tool_call_id)],
            }
        )
