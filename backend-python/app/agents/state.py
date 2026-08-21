"""Trip state definition and slot-checking logic."""

from typing import TypedDict, Optional, Any
from datetime import datetime, timedelta


SLOT_ORDER = ["destination", "dates", "duration", "travelers", "trip_style", "help_with", "origin"]

# Slots that are only required when help_with includes certain scopes.
# origin is only needed when flights/everything is in scope.
CONDITIONAL_SLOTS = {
    "origin": {"flights", "everything"},
}

# Slots that may need a follow-up question (two-step capture).
# dates can be "fixed" (user said they have dates but didn't give them) or
# "flexible"/"unsure" (ask for a rough month), then a follow-up extracts the
# actual dates/month which get converted to assumed or concrete dates.
FOLLOWUP_SLOTS = {"dates"}


class TripState(TypedDict, total=False):
    tripId: Optional[str]
    status: str  # planning | upcoming | completed | archived
    cities: list[dict]
    dates: Optional[dict]
    travelers: Optional[dict]
    budget: Optional[dict]
    preferences: Optional[list[str]]
    pace: Optional[str]
    tripStyle: Optional[str]
    helpWith: Optional[list[str]]
    itinerary: Optional[dict]
    onboarding: dict
    routeProposal: Optional[dict]
    startLocation: Optional[str]
    version: int


def create_default_trip_state() -> TripState:
    return {
        "status": "planning",
        "cities": [],
        "onboarding": {"slotsFilled": [], "completed": False},
        "version": 0,
    }


SLOT_QUESTIONS = {
    "destination": {
        "question": "Where would you like to go?",
        "type": "text",
        "placeholder": "e.g., Tokyo, Kyoto, Osaka",
    },
    "dates": {
        "question": "When are you planning to travel?",
        "type": "date_picker",
        "options": [
            {"label": "I have specific dates", "value": "fixed"},
            {"label": "I'm flexible", "value": "flexible"},
            {"label": "Not sure yet", "value": "unsure"},
        ],
    },
    "duration": {
        "question": "How many days do you have for this trip?",
        "type": "text",
        "placeholder": "e.g., 7, 14, 21",
    },
    "travelers": {
        "question": "Who's going and what's the vibe?",
        "type": "chip_group",
        "options": [
            {"label": "Solo", "value": "solo"},
            {"label": "Couple", "value": "couple"},
            {"label": "Family", "value": "family"},
            {"label": "Friends", "value": "friends"},
            {"label": "Group", "value": "group"},
        ],
    },
    "trip_style": {
        "question": "What style of trip are you after?",
        "type": "chip_group",
        "options": [
            {"label": "Beaches", "value": "beaches"},
            {"label": "Culture", "value": "culture"},
            {"label": "Wellness", "value": "wellness"},
            {"label": "Adventure", "value": "adventure"},
            {"label": "Food & Drink", "value": "food"},
            {"label": "City exploration", "value": "city"},
        ],
    },
    "help_with": {
        "question": "What do you need help with?",
        "type": "chip_group",
        "options": [
            {"label": "Everything", "value": "everything"},
            {"label": "Itinerary", "value": "itinerary"},
            {"label": "Flights", "value": "flights"},
            {"label": "Hotels", "value": "hotels"},
            {"label": "Things to do", "value": "things_to_do"},
            {"label": "Restaurants", "value": "restaurants"},
        ],
    },
    "origin": {
        "question": "Where are you flying from?",
        "type": "text",
        "placeholder": "e.g., San Francisco, SFO, London",
    },
}

# Follow-up questions for slots in a "pending" state.
SLOT_FOLLOWUP_QUESTIONS = {
    "dates": {
        "fixed": {
            "question": "What are your travel dates?",
            "type": "text",
            "placeholder": "e.g., Oct 10 – Oct 20, 2026-10-10 to 2026-10-20",
        },
        "month": {
            "question": "What month are you thinking?",
            "type": "text",
            "placeholder": "e.g., October, December",
        },
    },
}


def _slot_in_scope(slot: str, trip_state: dict) -> bool:
    """Check whether a conditional slot is required given the current trip state."""
    required_scopes = CONDITIONAL_SLOTS.get(slot)
    if not required_scopes:
        return True
    help_with = (trip_state.get("helpWith") or [])
    if not help_with:
        # help_with not yet answered → defer the conditional slot
        return False
    return any(scope in required_scopes for scope in help_with)


def _dates_is_filled(dates: dict | None) -> bool:
    """dates is 'filled' when we have a concrete start date OR the user
    delegated the decision (flexible + assumed)."""
    if not dates:
        return False
    if dates.get("start"):
        return True
    # "you_decide" → flexible + assumed, no concrete start yet but slot is done.
    if dates.get("flexible") and dates.get("assumed"):
        return True
    return False


def _dates_pending_mode(dates: dict | None) -> str | None:
    """Return the pending follow-up mode for dates, or None if not pending."""
    if not dates:
        return None
    return dates.get("pending")


def check_slots(trip_state: dict | None) -> dict:
    """Check which slots are filled and which are missing.

    Handles conditional slots (origin only required when flights are in scope)
    and follow-up slots (dates may need a second question to get actual dates
    or a rough month).
    """
    if not trip_state:
        trip_state = create_default_trip_state()

    onboarding = trip_state.get("onboarding", {})
    slots_filled = list(onboarding.get("slotsFilled", []))

    # Determine which slots are still missing.
    missing: list[str] = []
    for s in SLOT_ORDER:
        if s in slots_filled:
            # Even if marked filled, dates may need a follow-up.
            if s == "dates" and not _dates_is_filled(trip_state.get("dates")):
                missing.append(s)
            continue
        # Conditional slot: skip if not in scope yet.
        if not _slot_in_scope(s, trip_state):
            continue
        missing.append(s)

    # Build questions for missing slots, with follow-up awareness for dates.
    questions = []
    for s in missing:
        if s == "dates":
            dates = trip_state.get("dates")
            pending_mode = _dates_pending_mode(dates)
            if pending_mode and pending_mode in SLOT_FOLLOWUP_QUESTIONS["dates"]:
                fq = SLOT_FOLLOWUP_QUESTIONS["dates"][pending_mode]
                questions.append({
                    "id": f"slot-{s}",
                    "slot": s,
                    "question": fq["question"],
                    "type": fq["type"],
                    "options": None,
                    "placeholder": fq.get("placeholder"),
                })
            else:
                questions.append({
                    "id": f"slot-{s}",
                    "slot": s,
                    "question": SLOT_QUESTIONS[s]["question"],
                    "type": SLOT_QUESTIONS[s]["type"],
                    "options": SLOT_QUESTIONS[s].get("options"),
                    "placeholder": SLOT_QUESTIONS[s].get("placeholder"),
                })
        else:
            questions.append({
                "id": f"slot-{s}",
                "slot": s,
                "question": SLOT_QUESTIONS[s]["question"],
                "type": SLOT_QUESTIONS[s]["type"],
                "options": SLOT_QUESTIONS[s].get("options"),
                "placeholder": SLOT_QUESTIONS[s].get("placeholder"),
            })

    return {
        "proceed": len(missing) == 0,
        "missingSlots": missing,
        "filledSlots": slots_filled,
        "questions": questions,
    }


def _assumed_dates_from_month(rough_month: str, duration: int | None) -> dict:
    """Convert a rough month name to assumed concrete dates.

    Picks the first Friday of the next occurrence of that month, and an end
    date = start + (duration-1) days. Falls back to a 7-day trip if duration
    is unknown.
    """
    months = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
    ]
    month_lower = (rough_month or "").lower().strip()
    try:
        target_month = months.index(month_lower)
    except ValueError:
        # Try numeric month
        try:
            target_month = int(month_lower) - 1
            if not 0 <= target_month <= 11:
                raise ValueError
        except (ValueError, TypeError):
            return {}

    today = datetime.today()
    # Find the next occurrence of the target month (this year or next year).
    year = today.year
    if target_month < today.month or (target_month == today.month and today.day > 15):
        year += 1

    # First Friday of that month.
    first_of_month = datetime(year, target_month + 1, 1)
    days_until_friday = (4 - first_of_month.weekday()) % 7  # 4 = Friday
    start = first_of_month + timedelta(days=days_until_friday)
    if start < today:
        # If the first Friday already passed this month, move to next month's.
        start = start + timedelta(weeks=4)

    dur = duration if duration and duration > 0 else 7
    end = start + timedelta(days=dur - 1)
    return {
        "start": start.date().isoformat(),
        "end": end.date().isoformat(),
        "assumed": True,
        "roughMonth": month_lower,
    }


def apply_slot_answer(trip_state: dict, slot: str, value: Any) -> dict:
    """Apply a slot answer to the trip state.

    For dates, supports two-step capture:
      - "fixed"/"flexible"/"unsure" → sets pending state, does NOT mark filled.
      - {"flexible": true, "roughMonth": "october"} → converts to assumed dates, marks filled.
      - {"start": "...", "end": "..."} → stores concrete dates, marks filled.
    """
    if not trip_state:
        trip_state = create_default_trip_state()

    trip_state = dict(trip_state)  # shallow copy
    onboarding = dict(trip_state.get("onboarding", {}))
    slots_filled = list(onboarding.get("slotsFilled", []))

    # Determine whether this answer completes the slot (marks it filled).
    marks_filled = True

    if slot == "destination":
        if isinstance(value, list):
            trip_state["cities"] = [{"name": v, "order": i} for i, v in enumerate(value)]
        else:
            trip_state["cities"] = [{"name": value, "order": 0}]

        # If duration was already set (filled before destination in parallel),
        # distribute nights across the new cities now.
        duration = trip_state.get("duration")
        if duration and isinstance(duration, (int, float)):
            total_nights = int(duration) - 1 if int(duration) > 1 else 1
            cities = trip_state["cities"]
            nights_per = max(1, total_nights // len(cities))
            for city in cities:
                city["nights"] = nights_per
            remainder = total_nights - nights_per * len(cities)
            if remainder > 0:
                cities[0]["nights"] = cities[0].get("nights", 0) + remainder
            trip_state["cities"] = cities
    elif slot == "dates":
        if value == "fixed":
            trip_state["dates"] = {"pending": "fixed"}
            marks_filled = False
        elif value == "flexible":
            trip_state["dates"] = {"flexible": True, "pending": "month"}
            marks_filled = False
        elif value == "unsure":
            trip_state["dates"] = {"flexible": True, "pending": "month"}
            marks_filled = False
        elif value == "you_decide":
            # AI decides → use flexible dates with a near-future assumed date.
            trip_state["dates"] = {"flexible": True, "assumed": True, "start": None, "end": None}
        elif isinstance(value, dict):
            if value.get("flexible") and value.get("roughMonth"):
                # Rough month → assumed concrete dates.
                duration = None
                # Try to derive duration from already-applied cities nights.
                cities = trip_state.get("cities", [])
                if cities:
                    duration = sum(c.get("nights", 0) for c in cities) + 1
                assumed = _assumed_dates_from_month(value["roughMonth"], duration)
                if assumed:
                    trip_state["dates"] = assumed
                else:
                    # Could not parse month → keep pending.
                    trip_state["dates"] = {"flexible": True, "pending": "month"}
                    marks_filled = False
            elif value.get("start"):
                trip_state["dates"] = {
                    "start": value["start"],
                    "end": value.get("end"),
                    "assumed": value.get("assumed", False),
                }
            else:
                trip_state["dates"] = value
        else:
            # Unknown value format — store but don't mark filled.
            trip_state["dates"] = {"raw": value}
            marks_filled = False
    elif slot == "duration":
        if value == "you_decide":
            # AI decides → default to 7 days.
            value = 7

        if isinstance(value, (int, float)):
            # Store the raw duration so it can be re-applied when cities are
            # set later (e.g., duration filled before destination in parallel).
            trip_state["duration"] = int(value)

            total_nights = int(value) - 1 if int(value) > 1 else 1
            cities = trip_state.get("cities", [])
            if cities:
                nights_per = max(1, total_nights // len(cities))
                for i, city in enumerate(cities):
                    city["nights"] = nights_per
                remainder = total_nights - nights_per * len(cities)
                if remainder > 0:
                    cities[0]["nights"] = cities[0].get("nights", 0) + remainder
                trip_state["cities"] = cities

            # If dates are already assumed from a rough month, recompute end date.
            dates = trip_state.get("dates")
            if dates and dates.get("start") and dates.get("assumed"):
                try:
                    start = datetime.fromisoformat(dates["start"])
                    end = start + timedelta(days=int(value) - 1)
                    dates["end"] = end.date().isoformat()
                    trip_state["dates"] = dates
                except Exception:
                    pass
    elif slot == "travelers":
        traveler_map = {
            "solo": {"adults": 1},
            "couple": {"adults": 2},
            "family": {"adults": 2, "children": 2},
            "friends": {"adults": 3},
            "group": {"adults": 5},
        }
        trip_state["travelers"] = traveler_map.get(value, {"adults": 1})
    elif slot == "budget":
        trip_state["budget"] = {"mode": value} if isinstance(value, str) else value
    elif slot == "pace":
        trip_state["pace"] = value
    elif slot == "trip_style":
        if value == "you_decide":
            trip_state["tripStyle"] = "balanced"
        else:
            trip_state["tripStyle"] = value
        trip_state["preferences"] = trip_state.get("preferences", []) or []
        if value != "you_decide" and value not in trip_state["preferences"]:
            trip_state["preferences"].append(value)
    elif slot == "help_with":
        if value == "you_decide":
            trip_state["helpWith"] = ["itinerary", "flights", "hotels", "things_to_do", "restaurants"]
        elif value == "everything":
            trip_state["helpWith"] = ["itinerary", "flights", "hotels", "things_to_do", "restaurants"]
        elif isinstance(value, list):
            trip_state["helpWith"] = value
        else:
            trip_state["helpWith"] = [value]
    elif slot == "origin":
        trip_state["startLocation"] = value

    if marks_filled and slot not in slots_filled:
        slots_filled.append(slot)

    onboarding["slotsFilled"] = slots_filled
    onboarding["completed"] = all(s in slots_filled for s in SLOT_ORDER)
    trip_state["onboarding"] = onboarding
    trip_state["version"] = trip_state.get("version", 0) + 1

    return trip_state
