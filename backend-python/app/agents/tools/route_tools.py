"""Route tools — propose_route using LLM to generate city-by-city night splits."""

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState
from langgraph.types import interrupt, Command
from langchain_openai import ChatOpenAI
from typing import Annotated, Any
import json

from app.config import settings
from app.agents.state import TripState
from app.utils.logger import logger


@tool
async def propose_route(state: Annotated[dict, InjectedState]) -> str:
    """Propose a route with city-by-city night splits based on the current trip state.
    Call this once all required slots (destination, dates, duration, travelers) are filled.
    Returns a route proposal with cities, nights per city, and rationale.
    """
    trip_state = state.get("trip_state") or {}
    cities = trip_state.get("cities", [])
    duration = 0
    for c in cities:
        duration += c.get("nights", 0)

    if not cities:
        return "Cannot propose route: no cities in trip state."

    city_names = [c["name"] for c in cities]

    # Use LLM to propose night splits
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    prompt = f"""\
You are a travel route planner. Given these cities: {city_names}
Total nights available: {duration}

Propose a route with night splits per city. Consider:
- Logical geographic order (minimize travel time)
- Popular cities deserve more nights
- First and last cities may need fewer nights (arrival/departure)

Respond with ONLY a JSON object:
{{
  "cities": [{{"name": "CityName", "nights": N, "order": 0}}],
  "totalNights": {duration},
  "rationale": "Brief explanation of the route"
}}
"""

    try:
        response = await model.ainvoke([{"role": "user", "content": prompt}])
        content = response.content if isinstance(response.content, str) else str(response.content)

        import re
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            proposal = json.loads(json_match.group())
        else:
            # Fallback: even split
            nights_per = max(1, duration // len(cities))
            proposal = {
                "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                "totalNights": duration,
                "rationale": f"Even split of {nights_per} nights per city.",
            }
    except Exception as e:
        logger.error(f"Route proposal LLM failed: {e}")
        nights_per = max(1, duration // len(cities))
        proposal = {
            "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
            "totalNights": duration,
            "rationale": f"Even split of {nights_per} nights per city.",
        }

    logger.info(f"[PROPOSE_ROUTE] Proposal: {json.dumps(proposal)}")

    # Human-in-the-loop: pause for route confirmation
    user_decision = interrupt({
        "type": "route_confirmation",
        "proposal": proposal,
        "message": f"Route proposed: {' → '.join(c['name'] for c in proposal['cities'])}. "
                   f"Total: {proposal['totalNights']} nights. Confirm?",
    })

    # user_decision is the resume value from Command(resume=...)
    if isinstance(user_decision, dict) and user_decision.get("confirmed"):
        logger.info("[PROPOSE_ROUTE] Route confirmed by user")
    else:
        logger.info("[PROPOSE_ROUTE] Route rejected or modified by user")

    # Format for the agent
    city_strs = [f"{c['name']} ({c['nights']} nights)" for c in proposal["cities"]]
    return (
        f"Route proposed: {' → '.join(city_strs)}\n"
        f"Total: {proposal['totalNights']} nights\n"
        f"Rationale: {proposal['rationale']}\n\n"
        f"Route proposal data: {json.dumps(proposal)}"
    )
