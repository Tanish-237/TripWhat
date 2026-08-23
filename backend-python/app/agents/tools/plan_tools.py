"""Plan tools — plan_trip (one-shot ingestion + route) and ask_question (LLM-driven rendering)."""

import json
import re
from datetime import datetime, timedelta
from typing import Annotated, Any

from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import InjectedState
from langgraph.types import Command

from app.agents.state import create_default_trip_state, normalize_dates, distribute_nights
from app.utils.logger import logger


def _repair_json(text: str) -> str:
    """Attempt to fix common LLM JSON mistakes (shared repair logic)."""
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```\s*$", "", text)

    # Replace smart quotes
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")

    # Replace single-quoted strings with double-quoted
    text = re.sub(r"([\[{,:])\s*'([^']*)'", r'\1 "\2"', text)
    text = re.sub(r"'([^']*)'\s*([,\]}:])", r'"\1" \2', text)
    text = re.sub(r"^\s*'([^']*)'", r'"\1"', text)
    text = re.sub(r"'([^']*)'\s*$", r'"\1"', text)

    # Quote unquoted property names
    text = re.sub(r'([{,]\s*)([a-zA-Z_]\w*)\s*:', r'\1"\2":', text)

    # Remove trailing commas
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Fix missing commas between items
    text = re.sub(r'(["\d\w\]\}])\s*(\{["\[])', r'\1,\2', text)
    # Fix missing comma between number/bool/null and a quoted property name
    text = re.sub(r'(\b\d+|true|false|null)\s+(")', r'\1, \2', text)
    # Fix missing comma between adjacent strings
    text = re.sub(r'"\s+"', '", "', text)

    return text


def _parse_json_robust(text: str) -> dict | None:
    """Parse JSON object from LLM output with repair attempts."""
    # Attempt 1: direct parse
    try:
        result = json.loads(text)
        return result if isinstance(result, dict) else None
    except (json.JSONDecodeError, TypeError):
        pass

    # Attempt 2: extract JSON object, then parse
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        raw = match.group()
        try:
            result = json.loads(raw)
            return result if isinstance(result, dict) else None
        except json.JSONDecodeError:
            # Attempt 3: repair and retry
            repaired = _repair_json(raw)
            try:
                result = json.loads(repaired)
                return result if isinstance(result, dict) else None
            except json.JSONDecodeError:
                # Attempt 4: extract again after repair
                match2 = re.search(r"\{[\s\S]*\}", repaired)
                if match2:
                    try:
                        result = json.loads(match2.group())
                        return result if isinstance(result, dict) else None
                    except json.JSONDecodeError:
                        pass

    return None


# ---------------------------------------------------------------------------
# Month name → assumed concrete dates
# ---------------------------------------------------------------------------

_MONTHS = {
    "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
    "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11,
    "jan": 0, "feb": 1, "mar": 2, "apr": 3, "jun": 5, "jul": 6, "aug": 7,
    "sep": 8, "oct": 9, "nov": 10, "dec": 11,
}


def _assumed_dates_from_month(rough_month: str, duration: int | None = None) -> dict:
    """Convert a rough month name (or 'Oct 2026') to assumed concrete dates.

    Picks the first Friday of the next occurrence of that month, and an end
    date = start + (duration-1) days. Falls back to a 7-day trip if duration
    is unknown.
    """
    month_lower = (rough_month or "").lower().strip()
    target_month: int | None = None
    target_year: int | None = None

    # Try "Oct 2026" or "October 2026" format
    m = re.match(r"^([a-z]+)\s+(\d{4})$", month_lower)
    if m:
        month_name, year_str = m.group(1), m.group(2)
        if month_name in _MONTHS:
            target_month = _MONTHS[month_name]
            target_year = int(year_str)

    if target_month is None:
        # Try "2026-10" format (YYYY-MM)
        m = re.match(r"^(\d{4})-(\d{1,2})$", month_lower)
        if m:
            target_year = int(m.group(1))
            target_month = int(m.group(2)) - 1
        elif month_lower in _MONTHS:
            target_month = _MONTHS[month_lower]
        else:
            # Try numeric month
            try:
                target_month = int(month_lower) - 1
                if not 0 <= target_month <= 11:
                    return {}
            except (ValueError, TypeError):
                return {}

    today = datetime.today()
    if target_year is None:
        year = today.year
        if target_month < today.month or (target_month == today.month and today.day > 15):
            year += 1
    else:
        year = target_year

    # First Friday of that month.
    first_of_month = datetime(year, target_month + 1, 1)
    days_until_friday = (4 - first_of_month.weekday()) % 7  # 4 = Friday
    start = first_of_month + timedelta(days=days_until_friday)
    if start < today:
        start = start + timedelta(weeks=4)

    dur = duration if duration and duration > 0 else 7
    end = start + timedelta(days=dur - 1)
    return {
        "start": start.date().isoformat(),
        "end": end.date().isoformat(),
        "assumed": True,
        "roughMonth": month_lower,
    }


# ---------------------------------------------------------------------------
# Route generation (moved from route_tools.py — no interrupt)
# ---------------------------------------------------------------------------

async def _generate_route(cities: list[dict], total_nights: int, preferences: str = "") -> dict:
    """Use LLM to propose night splits per city. No interrupt — just returns the proposal."""
    if not cities:
        return {"cities": [], "totalNights": 0, "rationale": ""}

    city_names = [c["name"] for c in cities]
    model = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
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
        # Handle list-of-content-blocks format from OpenAI
        if isinstance(content, list):
            content = "".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
        proposal = _parse_json_robust(content)
        if not proposal:
            raise ValueError("No JSON found")
    except Exception as e:
        logger.error(f"[PLAN_TRIP] Route LLM failed: {e}")
        nights_per = max(1, total_nights // len(cities))
        proposal = {
            "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
            "totalNights": total_nights,
            "rationale": f"Even split of {nights_per} nights per city.",
        }

    # Validate
    if not isinstance(proposal, dict) or not proposal.get("cities") or not isinstance(proposal["cities"], list):
        nights_per = max(1, total_nights // len(cities))
        proposal = {
            "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
            "totalNights": total_nights,
            "rationale": f"Even split of {nights_per} nights per city.",
        }
    else:
        actual_nights = sum(c.get("nights", 0) for c in proposal["cities"])
        if actual_nights != total_nights:
            proposal["totalNights"] = actual_nights

    logger.info(f"[PLAN_TRIP] Route: {json.dumps(proposal)}")
    return proposal


# ---------------------------------------------------------------------------
# plan_trip — one-shot parameter ingestion + route generation
# ---------------------------------------------------------------------------

@tool
async def plan_trip(
    destination: str | list[str],
    dates: str | dict | None = None,
    duration: int | None = None,
    travelers: str | None = None,
    trip_style: str | None = None,
    help_with: str | list[str] | None = None,
    origin: str | None = None,
    preferences: str = "",
    state: Annotated[dict, InjectedState] = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = None,
) -> Command:
    """Plan a trip with the given parameters. Call this when you have enough
    info to build a plan. For anything missing, state your assumption in your
    response and proceed.

    Args:
        destination: City or list of cities (e.g., "Tokyo" or ["Tokyo", "Kyoto", "Osaka"])
        dates: When — month name ("October", "December"), month+year ("Oct 2026"),
               date range ("2026-10-10 to 2026-10-20"), "flexible"/"any", or
               {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
        duration: Trip length in days (integer). Pass None if unknown.
        travelers: "solo", "couple", "family", "friends", "group", or None
        trip_style: "beaches", "culture", "adventure", "food", "city", "wellness", or None
        help_with: "everything", "itinerary", "flights", "hotels", "things_to_do", "restaurants",
                   or a list of these, or None
        origin: Where the user is flying from (only if flights are in scope)
        preferences: Optional user preferences for route (e.g., "more nights in Tokyo")

    Normalizes parameters:
    - Month names → assumed concrete dates (first Friday of that month)
    - "flexible"/"any" → near-future assumed dates
    - String duration → int
    - Distributes nights across cities

    Generates route (city night splits) and stores in trip_state.
    After this returns, call build_itinerary.
    """
    trip_state = state.get("trip_state") or {}
    if not trip_state:
        trip_state = create_default_trip_state()
    trip_state = dict(trip_state)

    # --- Destination ---
    if isinstance(destination, list):
        city_list = [str(c).strip() for c in destination if str(c).strip()]
    elif isinstance(destination, str) and "," in destination:
        city_list = [c.strip() for c in destination.split(",") if c.strip()]
    else:
        city_list = [str(destination).strip()]
    trip_state["cities"] = [{"name": c, "order": i} for i, c in enumerate(city_list)]

    # --- Duration ---
    if duration is not None:
        if isinstance(duration, str):
            # Try to extract a number from strings like "7", "7 days", "one week"
            if duration.strip().isdigit():
                duration = int(duration.strip())
            else:
                m = re.search(r"\d+", duration)
                if m:
                    duration = int(m.group())
                elif "week" in duration.lower():
                    duration = 7
                elif "weekend" in duration.lower():
                    duration = 3
                elif "month" in duration.lower():
                    duration = 30
                else:
                    duration = None
        if duration and isinstance(duration, (int, float)):
            trip_state["duration"] = int(duration)

    # Distribute nights across cities
    dur = trip_state.get("duration")
    if dur and isinstance(dur, (int, float)):
        distribute_nights(trip_state, int(dur))

    # --- Dates ---
    if dates is not None:
        normalized = normalize_dates(dates, trip_state.get("duration"))
        if normalized:
            trip_state["dates"] = normalized

    # --- Travelers ---
    if travelers:
        traveler_map = {
            "solo": {"adults": 1},
            "couple": {"adults": 2},
            "family": {"adults": 2, "children": 2},
            "friends": {"adults": 3},
            "group": {"adults": 5},
        }
        trip_state["travelers"] = traveler_map.get(travelers, {"adults": 1})

    # --- Trip style ---
    if trip_style:
        if trip_style == "you_decide" or trip_style == "balanced":
            trip_state["tripStyle"] = "balanced"
        elif isinstance(trip_style, str) and " and " in trip_style:
            parts = [p.strip() for p in trip_style.split(" and ")]
            trip_state["tripStyle"] = parts[0]
            trip_state["preferences"] = trip_state.get("preferences", []) or []
            for sv in parts:
                if sv not in trip_state["preferences"]:
                    trip_state["preferences"].append(sv)
        else:
            trip_state["tripStyle"] = trip_style
        trip_state["preferences"] = trip_state.get("preferences", []) or []
        if trip_style not in ("you_decide", "balanced") and trip_style not in trip_state["preferences"]:
            trip_state["preferences"].append(trip_style)

    # --- Help with ---
    if help_with:
        if help_with in ("you_decide", "everything"):
            trip_state["helpWith"] = ["itinerary", "flights", "hotels", "things_to_do", "restaurants"]
        elif isinstance(help_with, list):
            trip_state["helpWith"] = help_with
        else:
            trip_state["helpWith"] = [help_with]

    # --- Origin ---
    if origin:
        trip_state["startLocation"] = origin

    # --- Route generation ---
    cities = trip_state.get("cities", [])
    total_nights = sum(c.get("nights", 0) for c in cities)
    if total_nights == 0:
        dur = trip_state.get("duration", 0)
        total_nights = max(1, dur - 1) if dur and dur > 1 else 1

    if cities:
        proposal = await _generate_route(cities, total_nights, preferences)
        trip_state["routeProposal"] = proposal

    trip_state["version"] = trip_state.get("version", 0) + 1

    # Build a summary for the LLM
    city_strs = [f"{c['name']} ({c.get('nights', 0)} nights)" for c in (trip_state.get("routeProposal") or {}).get("cities", [])]
    dates_str = ""
    if trip_state.get("dates", {}).get("start"):
        d = trip_state["dates"]
        dates_str = f"Dates: {d.get('start')} to {d.get('end')}"
        if d.get("assumed"):
            dates_str += " (assumed)"

    tool_msg = (
        f"Trip planned!\n"
        f"Route: {' → '.join(city_strs)}\n"
        f"Total: {sum(c.get('nights', 0) for c in (trip_state.get('routeProposal') or {}).get('cities', []))} nights\n"
        f"{dates_str}\n"
        f"The route is ready. You MUST call build_itinerary NOW to generate "
        f"the detailed day-by-day itinerary. Do NOT ask the user if they want "
        f"to build it — just call build_itinerary immediately."
    )

    return Command(
        update={
            "trip_state": trip_state,
            "messages": [ToolMessage(content=tool_msg, tool_call_id=tool_call_id)],
        },
    )


# ---------------------------------------------------------------------------
# ask_question — LLM-driven dynamic question rendering
# ---------------------------------------------------------------------------

@tool
async def ask_question(
    question: str,
    options: list[dict] | None = None,
    allow_custom: bool = True,
    allow_multi_select: bool = False,
    placeholder: str | None = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = None,
) -> Command:
    """Render a question card in the chat for the user to answer.

    Use this when you need information from the user to plan their trip.
    You decide what to ask based on what's already in trip_state — there is
    no fixed order. Ask only for what you actually need to build a good plan.

    ALWAYS prefer this tool over asking in plain text when you need structured
    trip planning info (dates, duration, travelers, trip_style, help_with).
    The question card gives users clickable options which is much faster than
    typing. Only ask in plain text for open-ended clarification that doesn't
    fit the option-card pattern.

    TRIGGER: Call this tool when you are about to ask the user about:
    - When they want to travel (dates) → generate next 12 months as options
    - How long they want to stay (duration) → offer Weekend/1 week/2 weeks options
    - Who they're traveling with (travelers) → offer Solo/Couple/Family/Friends
    - What style of trip (trip_style) → offer Beaches/Culture/Adventure/Food/City
    - What they need help with (help_with) → multi-select: itinerary/flights/hotels

    If you find yourself typing a question like "When are you thinking of going?"
    or "How long do you want to stay?" — STOP and call this tool instead.

    Args:
        question: The question to ask the user (e.g., "When are you thinking of going to Mumbai?")
        options: List of selectable options, each {"label": "display text", "value": "machine value"}.
                 For dates, generate the next 12 months as options.
                 For duration, use natural options like [{"label": "Weekend", "value": 3}, {"label": "~1 week", "value": 7}].
                 Include {"label": "Let Stardrift decide", "value": "you_decide"} when appropriate.
                 Set to None for a pure free-text question.
        allow_custom: Show a "Type something else..." free text input (default True)
        allow_multi_select: Allow selecting multiple options (e.g., "Select all that apply")
        placeholder: Placeholder text for the free-text input

    The user's answer will come back as a normal user message. Process it and
    then call plan_trip, ask_question, or respond with natural text.

    You can also print natural text WITHOUT a widget — just respond normally
    without calling this tool. Mix natural text with questions as needed.
    For example: "I've got Mumbai and January 2027 — I just need the trip length."
    then call ask_question for the duration.
    """
    widget_data = {
        "question": question,
        "options": options,
        "allowCustom": allow_custom,
        "allowMultiSelect": allow_multi_select,
        "placeholder": placeholder or "Type something else...",
    }

    # Store the widget in trip_state so chat_stream can emit it.
    # We use a _pendingWidget field that chat_stream reads after the stream
    # completes. (get_stream_writer() doesn't work reliably with astream_events
    # v3 without a custom transformer — this is simpler.)
    return Command(
        update={
            "trip_state": {"_pendingWidget": {"type": "question_card", "data": widget_data}},
            "messages": [ToolMessage(
                content=f"Question rendered: {question}",
                tool_call_id=tool_call_id,
            )],
        },
    )
