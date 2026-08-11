"""Trip state definition and slot-checking logic."""

from typing import TypedDict, Optional, Any
from langgraph.graph import MessagesState


SLOT_ORDER = ["destination", "dates", "duration", "travelers", "trip_style", "help_with"]


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
}


def check_slots(trip_state: dict | None) -> dict:
    """Check which slots are filled and which are missing."""
    if not trip_state:
        trip_state = create_default_trip_state()

    onboarding = trip_state.get("onboarding", {})
    slots_filled = onboarding.get("slotsFilled", [])
    missing = [s for s in SLOT_ORDER if s not in slots_filled]

    return {
        "proceed": len(missing) == 0,
        "missingSlots": missing,
        "filledSlots": slots_filled,
        "questions": [
            {
                "id": f"slot-{s}",
                "slot": s,
                "question": SLOT_QUESTIONS[s]["question"],
                "type": SLOT_QUESTIONS[s]["type"],
                "options": SLOT_QUESTIONS[s].get("options"),
                "placeholder": SLOT_QUESTIONS[s].get("placeholder"),
            }
            for s in missing
        ],
    }


def apply_slot_answer(trip_state: dict, slot: str, value: Any) -> dict:
    """Apply a slot answer to the trip state."""
    if not trip_state:
        trip_state = create_default_trip_state()

    trip_state = dict(trip_state)  # shallow copy
    onboarding = dict(trip_state.get("onboarding", {}))
    slots_filled = list(onboarding.get("slotsFilled", []))

    if slot not in slots_filled:
        slots_filled.append(slot)

    onboarding["slotsFilled"] = slots_filled
    onboarding["completed"] = all(s in slots_filled for s in SLOT_ORDER)
    trip_state["onboarding"] = onboarding
    trip_state["version"] = trip_state.get("version", 0) + 1

    if slot == "destination":
        if isinstance(value, list):
            trip_state["cities"] = [{"name": v, "order": i} for i, v in enumerate(value)]
        else:
            trip_state["cities"] = [{"name": value, "order": 0}]
    elif slot == "dates":
        if value == "flexible":
            trip_state["dates"] = {"flexible": True}
        elif value == "unsure":
            trip_state["dates"] = {"flexible": True}
        elif isinstance(value, dict):
            trip_state["dates"] = value
    elif slot == "duration":
        if isinstance(value, (int, float)):
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
            trip_state["helpWith"] = ["itinerary"]
        elif value == "everything":
            trip_state["helpWith"] = ["itinerary", "flights", "hotels", "things_to_do", "restaurants"]
        elif isinstance(value, list):
            trip_state["helpWith"] = value
        else:
            trip_state["helpWith"] = [value]

    return trip_state
