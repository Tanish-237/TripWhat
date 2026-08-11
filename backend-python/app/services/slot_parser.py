"""LLM-based slot answer parser — ported from slot-parser.ts."""

import json
import re

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing import Union, Optional

from app.config import settings
from app.utils.logger import logger


SLOT_DESCRIPTIONS = {
    "destination": (
        'The user is answering "Where would you like to go?". '
        "Extract city or destination names. "
        'Return a string for one city (e.g., "Tokyo"), or an array of strings for multiple cities (e.g., ["Tokyo", "Kyoto", "Osaka"]). '
        'If the user says something conversational like "yes", "sure", "let\'s plan", "flexible", "solo", "budget" — that is NOT a destination answer.'
    ),
    "dates": (
        'The user is answering "When are you planning to travel?". '
        'Return "flexible" if they want flexible dates. '
        'Return "unsure" if they\'re not sure yet. '
        'Return "fixed" if they say they have specific dates but haven\'t provided them. '
        'Return { start: "YYYY-MM-DD", end?: "YYYY-MM-DD" } for specific dates. '
        'Return { flexible: true, roughMonth: "october" } if they mention a month but are flexible. '
        'Conversational responses like "yes", "ok", "let\'s plan" are NOT date answers.'
    ),
    "duration": (
        'The user is answering "How many days do you have for this trip?". '
        'Return a number representing total days. "2 weeks" = 14, "5 days" = 5, "a week" = 7. '
        "Conversational responses are NOT duration answers."
    ),
    "travelers": (
        'The user is answering "Who\'s going and what\'s the vibe?". '
        'Return one of: "solo", "couple", "family", "friends", "group". '
        '"just me" = "solo", "with my wife" = "couple", "with kids" = "family", "2 people" = "couple", "5 people" = "group". '
        "Conversational responses are NOT traveler answers."
    ),
    "trip_style": (
        'The user is answering "What style of trip are you after?". '
        'Return one of: "beaches", "culture", "wellness", "adventure", "food", "city". '
        '"beach" = "beaches", "historical" = "culture", "temple" = "culture", "relax" = "wellness", "spa" = "wellness", '
        '"hiking" = "adventure", "outdoors" = "adventure", "eating" = "food", "culinary" = "food", "urban" = "city", "exploring" = "city". '
        'Also return "you_decide" if the user says "you decide", "not sure", "whatever", "any". '
        "Conversational responses that don\'t indicate a trip style are NOT answers."
    ),
    "help_with": (
        'The user is answering "What do you need help with?". '
        'Return one of: "itinerary", "flights", "hotels", "things_to_do", "restaurants", "everything". '
        'Return an array for multiple selections (e.g., ["itinerary", "hotels"]). '
        'Return "everything" if the user says "everything", "all", "all of it", "everything you can". '
        '"plan" = "itinerary", "schedule" = "itinerary", "fly" = "flights", "stay" = "hotels", "activities" = "things_to_do", "eat" = "restaurants". '
        'Also return "you_decide" if the user says "you decide", "not sure", "whatever", "any". '
        "Conversational responses that don't indicate what they need help with are NOT answers."
    ),
    "budget": (
        'The user is answering "What\'s your budget style?". '
        'Return one of: "budget", "mid-range", "luxury". '
        '"cheap" = "budget", "comfortable" = "mid-range", "expensive" = "luxury". '
        "Conversational responses are NOT budget answers."
    ),
    "pace": (
        'The user is answering "How do you like to travel?". '
        'Return one of: "relaxed", "moderate", "packed". '
        '"slow" = "relaxed", "chill" = "relaxed", "balanced" = "moderate", "fast" = "packed", "busy" = "packed". '
        "Conversational responses are NOT pace answers."
    ),
}

VALID_TRAVELERS = {"solo", "couple", "family", "friends", "group"}
VALID_TRIP_STYLES = {"beaches", "culture", "wellness", "adventure", "food", "city", "you_decide"}
VALID_HELP_WITH = {"itinerary", "flights", "hotels", "things_to_do", "restaurants", "you_decide", "everything"}
VALID_BUDGET = {"budget", "mid-range", "luxury"}
VALID_PACE = {"relaxed", "moderate", "packed"}


class SlotParser:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        return self._model

    async def parse(self, slot: str, question: str, user_query: str) -> Optional[any]:
        slot_desc = SLOT_DESCRIPTIONS.get(slot)
        if not slot_desc:
            return None

        system_prompt = (
            "You are a precise slot-answer parser for a travel planning assistant. "
            "Your job is to determine whether the user's message is answering a specific question, "
            "and if so, extract the structured answer value.\n\n"
            "Rules:\n"
            "1. If the user is NOT answering the question (e.g., they're being conversational, "
            'asking a different question, or saying "yes"/"sure"/"let\'s plan"), set is_answer to false and value to null.\n'
            "2. If the user IS answering, set is_answer to true and extract the value in the correct format.\n"
            "3. Be conservative — when in doubt, return is_answer=false.\n\n"
            f"Slot type: {slot}\n"
            f'Question asked: "{question}"\n'
            f"Slot description: {slot_desc}\n\n"
            "Respond with ONLY a valid JSON object:\n"
            '{"is_answer": true/false, "value": <parsed_value_or_null>, "reasoning": "brief explanation"}'
        )

        try:
            response = await self.model.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ])
            content = response.content if isinstance(response.content, str) else str(response.content)

            json_match = re.search(r"\{[\s\S]*\}", content)
            if not json_match:
                return _fallback(slot, user_query)

            parsed = json.loads(json_match.group())
            if not parsed.get("is_answer") or parsed.get("value") is None:
                return None

            value = parsed["value"]

            if slot == "travelers" and isinstance(value, str) and value not in VALID_TRAVELERS:
                return None
            if slot == "trip_style" and isinstance(value, str) and value not in VALID_TRIP_STYLES:
                return None
            if slot == "help_with":
                if isinstance(value, list):
                    if not all(v in VALID_HELP_WITH for v in value):
                        return None
                elif isinstance(value, str) and value not in VALID_HELP_WITH:
                    return None
            if slot == "budget" and isinstance(value, str) and value not in VALID_BUDGET:
                return None
            if slot == "pace" and isinstance(value, str) and value not in VALID_PACE:
                return None

            logger.info(f"[SLOT_PARSER] LLM parsed {user_query!r} → {slot}: {json.dumps(value)}")
            return value
        except Exception as e:
            logger.error(f"[SLOT_PARSER] LLM parsing failed, falling back to regex: {e}")
            return _fallback(slot, user_query)


def _fallback(slot: str, user_query: str) -> Optional[any]:
    """Regex-based fallback parser."""
    q = user_query.lower().strip()

    if slot == "destination":
        if not q or len(q) > 100:
            return None
        conversational = [
            "let's plan", "lets plan", "plan it", "sounds good", "looks good",
            "why not", "definitely", "absolutely", "not sure", "maybe", "no idea",
            "don't know", "dont know", "please", "continue",
            "flexible", "flex", "unsure", "fixed", "specific",
            "solo", "alone", "myself", "couple", "partner", "family", "kids",
            "friends", "group", "budget", "cheap", "luxury", "mid-range",
            "relaxed", "moderate", "packed", "fast", "slow",
            "confirm", "build", "itinerary", "route",
        ]
        exact_words = ["go", "next", "back", "ok", "okay", "yes", "sure", "stop", "skip", "start", "begin", "help"]
        if any(re.search(rf"\b{w}\b", q) for w in exact_words) or any(p in q for p in conversational):
            return None
        if "," in q or " and " in q:
            parts = [p.strip() for p in re.split(r"\s*(?:,|and)\s*", user_query, flags=re.IGNORECASE) if p.strip()]
            return parts if parts else None
        words = q.split()
        if len(words) <= 3:
            return user_query.strip()
        return None

    if slot == "dates":
        if "flexible" in q or "flex" in q:
            return "flexible"
        if any(x in q for x in ["not sure", "unsure", "no idea", "don't know"]):
            return "unsure"
        date_match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", user_query)
        if date_match:
            return {"start": f"{date_match[1]}-{date_match[2].zfill(2)}-{date_match[3].zfill(2)}", "end": None}
        months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
        month_match = next((m for m in months if re.search(rf"\b{m}\b", q)), None)
        if month_match:
            return {"flexible": True, "roughMonth": month_match}
        if any(x in q for x in ["i have dates", "fixed", "specific"]):
            return "fixed"
        return None

    if slot == "duration":
        dur_match = re.search(r"(\d+)\s*[-]?\s*(?:day|days|week|weeks|night|nights)", q)
        if dur_match:
            num = int(dur_match.group(1))
            return num * 7 if "week" in dur_match.group(0) else num
        num_match = re.match(r"^\s*(\d+)\s*$", user_query)
        if num_match:
            return int(num_match.group(1))
        return None

    if slot == "travelers":
        traveler_map = {
            "solo": "solo", "alone": "solo", "just me": "solo", "myself": "solo",
            "couple": "couple", "partner": "couple", "girlfriend": "couple", "boyfriend": "couple",
            "wife": "couple", "husband": "couple", "spouse": "couple",
            "family": "family", "kids": "family", "children": "family",
            "friends": "friends", "friend": "friends", "buddy": "friends", "buddies": "friends",
            "group": "group", "team": "group",
        }
        for keyword, value in traveler_map.items():
            if keyword in q:
                return value
        people_match = re.search(r"(\d+)\s*(?:people|person|adults?|travelers?)", q)
        if people_match:
            n = int(people_match.group(1))
            return "solo" if n == 1 else "couple" if n == 2 else "group" if n > 4 else "friends"
        return None

    if slot == "budget":
        if "budget" in q or "cheap" in q or "backpack" in q:
            return "budget"
        if "mid" in q or "moderate" in q or "comfortable" in q:
            return "mid-range"
        if "luxury" in q or "expensive" in q or "high end" in q or "premium" in q:
            return "luxury"
        return None

    if slot == "pace":
        if "relax" in q or "slow" in q or "chill" in q or "laid back" in q:
            return "relaxed"
        if "moderate" in q or "balanced" in q:
            return "moderate"
        if "pack" in q or "fast" in q or "intense" in q or "busy" in q or "full" in q:
            return "packed"
        return None

    if slot == "trip_style":
        if any(x in q for x in ["you decide", "you_decide", "not sure", "whatever", "any", "no preference"]):
            return "you_decide"
        if "beach" in q:
            return "beaches"
        if any(x in q for x in ["culture", "historical", "history", "temple", "museum", "tradition"]):
            return "culture"
        if any(x in q for x in ["wellness", "relax", "spa", "yoga", "meditation", "rejuvenate"]):
            return "wellness"
        if any(x in q for x in ["adventure", "hiking", "outdoor", "trek", "active", "sports"]):
            return "adventure"
        if any(x in q for x in ["food", "eat", "culinary", "cuisine", "dining", "restaurant"]):
            return "food"
        if any(x in q for x in ["city", "urban", "explore", "exploring", "neighborhood", "walking"]):
            return "city"
        return None

    if slot == "help_with":
        if any(x in q for x in ["you decide", "you_decide", "not sure", "whatever", "no preference"]):
            return "you_decide"
        if any(x in q for x in ["everything", "all of it", "all of them", "all the above", "all"]):
            return "everything"
        result = []
        if any(x in q for x in ["itinerary", "plan", "schedule", "route", "trip"]):
            result.append("itinerary")
        if any(x in q for x in ["flight", "fly", "air", "plane"]):
            result.append("flights")
        if any(x in q for x in ["hotel", "stay", "accommodation", "lodging", "airbnb"]):
            result.append("hotels")
        if any(x in q for x in ["things to do", "activities", "activity", "attractions", "sightseeing", "tours"]):
            result.append("things_to_do")
        if any(x in q for x in ["restaurant", "eat", "dining", "food"]):
            result.append("restaurants")
        return result if result else None

    return None


slot_parser = SlotParser()
