"""Travel agent — LangGraph Python create_agent with InjectedState tools.

This replaces both travel-agent.ts (70KB LangGraph StateGraph) and
deep-travel-agent.ts (10KB JS deep agent with broken state).

Key fix: Python's InjectedState annotation lets tools read/write agent
state natively. The MemorySaver checkpointer persists state per
conversation_id (thread_id). No mutable context hacks needed.
"""

import json
import re
from typing import Any

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent as create_agent

from app.config import settings
from app.agents.prompts import DEEP_AGENT_SYSTEM_PROMPT
from app.agents.state import check_slots, apply_slot_answer, SLOT_ORDER, create_default_trip_state
from app.agents.tools.slot_tools import check_trip_status, fill_trip_slot
from app.agents.tools.search_tools import search_destinations, web_search, resolve_places
from app.agents.tools.place_tools import get_place_details, find_nearby_attractions
from app.agents.tools.route_tools import propose_route
from app.agents.tools.itinerary_tools import build_itinerary, edit_itinerary
from app.agents.tools.calendar_tools import create_calendar_event
from app.agents.tools.mcp_tools import mcp_search_places, mcp_resolve_names, mcp_compute_routes, mcp_lookup_weather
from app.services.slot_parser import slot_parser, SLOT_DESCRIPTIONS
from app.services.itinerary_builder import itinerary_builder
from app.utils.logger import logger


class TravelAgent:
    """LangGraph-based travel agent with proper state persistence."""

    def __init__(self):
        self.model_name = "gpt-4o-mini"
        self.checkpointer = MemorySaver()
        self._agent = None
        self._model = None
        self._tools = [
            check_trip_status,
            fill_trip_slot,
            search_destinations,
            web_search,
            resolve_places,
            get_place_details,
            find_nearby_attractions,
            propose_route,
            build_itinerary,
            edit_itinerary,
            create_calendar_event,
            mcp_search_places,
            mcp_resolve_names,
            mcp_compute_routes,
            mcp_lookup_weather,
        ]

    @property
    def agent(self):
        if self._agent is None:
            self._agent = create_agent(
                model=ChatOpenAI(model=self.model_name, temperature=0.7),
                tools=self._tools,
                prompt=DEEP_AGENT_SYSTEM_PROMPT,
                checkpointer=self.checkpointer,
            )
        return self._agent

    @property
    def model(self):
        if self._model is None:
            self._model = ChatOpenAI(model=self.model_name, temperature=0)
        return self._model

    async def chat_stream(self, message: str, conversation_id: str, context: dict | None = None):
        """Stream agent responses token-by-token, yielding structured events.

        Yields dicts with "type" key:
          - {"type": "token", "text": "..."} — LLM token delta
          - {"type": "status", "status": "..."} — progress update
          - {"type": "tripState", "tripState": {...}} — partial state update
          - {"type": "interrupt", "payload": {...}} — HITL pause for route confirmation
          - {"type": "complete", "payload": {...}} — final result (same shape as chat())
        """
        context = context or {}
        trip_state = context.get("tripState")
        history = context.get("history", [])

        messages = []
        for h in history[-6:]:
            if h.startswith("user:"):
                messages.append({"role": "user", "content": h[5:].strip()})
            elif h.startswith("assistant:"):
                messages.append({"role": "assistant", "content": h[10:].strip()})

        state_context = self._build_state_context(trip_state)
        if state_context:
            messages.append({"role": "system", "content": state_context})
        messages.append({"role": "user", "content": message})

        pre_check = check_slots(trip_state)
        pre_count = len(SLOT_ORDER) if pre_check["proceed"] else len(SLOT_ORDER) - len(pre_check["missingSlots"])

        logger.info(f"[AGENT_STREAM] Processing: {message!r} (conv={conversation_id})")

        if not trip_state or not trip_state.get("onboarding", {}).get("slotsFilled"):
            final_trip_state = await self._pre_parse_initial_message(message, trip_state)
            if final_trip_state:
                trip_state = final_trip_state
                pre_check = check_slots(trip_state)
                pre_count = len(SLOT_ORDER) if pre_check["proceed"] else len(SLOT_ORDER) - len(pre_check["missingSlots"])
                logger.info(f"[AGENT_STREAM] Pre-parsed {pre_count}/{len(SLOT_ORDER)} slots")

        final_trip_state = trip_state
        response_text = ""

        if not pre_check["proceed"]:
            missing_slot = pre_check["missingSlots"][0] if pre_check["missingSlots"] else None
            next_question = pre_check["questions"][0] if pre_check["questions"] else None
            if missing_slot and next_question:
                logger.info(f"[AGENT_STREAM] Onboarding — trying fallback parser for '{missing_slot}'")
                try:
                    parsed = await slot_parser.parse(missing_slot, next_question["question"], message)
                    if parsed is not None:
                        final_trip_state = apply_slot_answer(final_trip_state or {}, missing_slot, parsed)
                except Exception as e:
                    logger.error(f"[AGENT_STREAM] Fallback parser failed: {e}")

            post_check = check_slots(final_trip_state)
            if not post_check["proceed"] and post_check["questions"]:
                response_text = post_check["questions"][0]["question"]
            elif post_check["proceed"]:
                response_text = ""
            else:
                response_text = "I apologize, but I had trouble processing your request."
        else:
            # Post-onboarding: stream the agent execution
            config = {"configurable": {"thread_id": conversation_id}}
            try:
                stream = await self.agent.astream_events(
                    {"messages": messages}, config=config, version="v3"
                )

                async for message_event in stream.messages:
                    text = str(message_event.text)
                    if text:
                        yield {"type": "token", "text": text}
                        response_text += text

                # Check for interrupts (e.g., route confirmation)
                if stream.interrupted:
                    interrupt_info = stream.interrupts[0].value if stream.interrupts else {}
                    yield {"type": "interrupt", "payload": interrupt_info}
                    return

            except Exception as e:
                logger.error(f"[AGENT_STREAM] Streaming failed, falling back to invoke: {e}")
                result = await self.agent.ainvoke({"messages": messages}, config=config)
                ai_messages = [m for m in result.get("messages", []) if m.type == "ai"]
                for msg in reversed(ai_messages):
                    content = msg.content if isinstance(msg.content, str) else str(msg.content)
                    if content and content.strip():
                        response_text = content.strip()
                        break

            if not response_text:
                response_text = "I apologize, but I had trouble processing your request."

            post_check = check_slots(final_trip_state)

        # Auto-build route + itinerary when onboarding just completed
        if post_check["proceed"] and final_trip_state and not final_trip_state.get("itinerary"):
            if not final_trip_state.get("routeProposal"):
                yield {"type": "status", "status": "Generating route proposal..."}
                final_trip_state = await self._auto_propose_route(final_trip_state)
                yield {"type": "tripState", "tripState": final_trip_state}

            if final_trip_state.get("routeProposal") and not final_trip_state.get("itinerary"):
                yield {"type": "status", "status": "Building your itinerary..."}
                final_trip_state = await self._auto_build_itinerary(final_trip_state)
                if final_trip_state.get("itinerary"):
                    response_text = "I've put together your itinerary! Check it out on the right — you can ask me to adjust anything."
                yield {"type": "tripState", "tripState": final_trip_state}

        itinerary = None
        if final_trip_state and final_trip_state.get("itinerary"):
            itinerary = final_trip_state["itinerary"]

        route_proposal = None
        if final_trip_state and final_trip_state.get("routeProposal"):
            route_proposal = final_trip_state["routeProposal"]

        widgets = self._build_widgets(final_trip_state, post_check)
        suggestions = self._build_suggestions(final_trip_state, post_check)

        yield {
            "type": "complete",
            "payload": {
                "response": response_text,
                "tripState": final_trip_state,
                "itinerary": itinerary,
                "widgets": widgets,
                "suggestions": suggestions,
                "classification": None,
                "changeSummary": [],
            },
        }

    async def _pre_parse_initial_message(self, message: str, trip_state: dict | None) -> dict | None:
        """Pre-parse the initial user message to extract all possible slots at once.
        
        This lets us skip questions that the user already answered in their first message
        (e.g., "5 day solo Japan trip" fills destination, duration, and travelers).
        """
        from app.agents.state import SLOT_ORDER, SLOT_QUESTIONS

        system_prompt = (
            "You are a travel planning slot extractor. Given a user's initial trip request, "
            "extract any information that answers these onboarding questions:\n\n"
        )
        for slot in SLOT_ORDER:
            q = SLOT_QUESTIONS[slot]
            system_prompt += f"- {slot}: {q['question']}\n"
            if q.get("options"):
                valid_vals = [o["value"] for o in q["options"]]
                system_prompt += f"  Valid values: {valid_vals}\n"
            system_prompt += f"  Description: {SLOT_DESCRIPTIONS.get(slot, '')}\n"

        system_prompt += (
            "\nRules:\n"
            "1. Only extract info that is clearly stated in the message.\n"
            "2. For destination, extract city names. Multiple cities = array.\n"
            "3. For duration, return a number of days.\n"
            "4. For dates, return 'flexible' if they mention flexibility, 'unsure' if not sure.\n"
            "5. For travelers, map 'solo/alone/just me' to 'solo', 'with wife/partner' to 'couple', etc.\n"
            "6. For trip_style, map keywords: 'beach'→'beaches', 'culture/history/temple'→'culture', "
            "'relax/spa'→'wellness', 'hiking/adventure'→'adventure', 'food/eating'→'food', 'city/urban'→'city'.\n"
            "7. For help_with, only extract if explicitly stated.\n"
            "8. If a slot is NOT mentioned, omit it from the response.\n"
            "9. For startLocation, extract the city they're departing from if mentioned (e.g., 'from London' → 'London').\n\n"
            "Respond with ONLY a JSON object with the slots you could extract, e.g.:\n"
            '{"destination": "Tokyo", "duration": 5, "travelers": "solo", "startLocation": "London"}\n'
            "If nothing can be extracted, return {}."
        )

        try:
            response = await self.model.ainvoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ])
            content = response.content if isinstance(response.content, str) else str(response.content)
            json_match = re.search(r"\{[\s\S]*\}", content)
            if not json_match:
                return None

            extracted = json.loads(json_match.group())
            if not extracted:
                return None

            logger.info(f"[AGENT] Pre-parse extracted: {json.dumps(extracted)}")

            state = trip_state or create_default_trip_state()
            for slot in SLOT_ORDER:
                if slot in extracted and extracted[slot] is not None:
                    state = apply_slot_answer(state, slot, extracted[slot])

            # Extract startLocation (not a slot, but useful for flight search)
            if extracted.get("startLocation"):
                state["startLocation"] = extracted["startLocation"]

            return state
        except Exception as e:
            logger.error(f"[AGENT] Pre-parse failed: {e}")
            return None

    def _build_state_context(self, trip_state: dict | None) -> str:
        """Build a system context string describing the current trip state."""
        if not trip_state:
            return ""

        parts = ["Current trip state:"]
        parts.append(f"  Status: {trip_state.get('status', 'planning')}")

        onboarding = trip_state.get("onboarding", {})
        slots_filled = onboarding.get("slotsFilled", [])
        parts.append(f"  Slots filled: {slots_filled}")

        cities = trip_state.get("cities", [])
        if cities:
            parts.append(f"  Cities: {', '.join(c.get('name', '') for c in cities)}")

        dates = trip_state.get("dates")
        if dates:
            parts.append(f"  Dates: {dates}")

        travelers = trip_state.get("travelers")
        if travelers:
            parts.append(f"  Travelers: {travelers}")

        if trip_state.get("routeProposal"):
            parts.append("  Route proposed: YES (user has seen it)")

        if trip_state.get("itinerary"):
            parts.append("  Itinerary built: YES")

        return "\n".join(parts)

    def _build_widgets(self, trip_state: dict | None, slot_check: dict) -> list[dict]:
        """Build UI widgets based on current state."""
        widgets = []

        if not slot_check["proceed"] and slot_check["questions"]:
            q = slot_check["questions"][0]
            widgets.append({
                "type": "question_card",
                "data": {
                    "id": f"slot-{q['slot']}",
                    "slot": q["slot"],
                    "question": q["question"],
                    "type": q["type"],
                    "options": q.get("options"),
                    "placeholder": q.get("placeholder"),
                },
            })

        # Don't show route_proposal widget if itinerary already built
        if trip_state and trip_state.get("routeProposal") and not trip_state.get("itinerary"):
            widgets.append({
                "type": "route_proposal",
                "data": trip_state["routeProposal"],
            })

        return widgets

    async def _auto_propose_route(self, trip_state: dict) -> dict:
        """Auto-generate a route proposal using the route tool logic directly."""
        import json as _json
        from langchain_openai import ChatOpenAI as _LLM

        cities = trip_state.get("cities", [])
        duration = sum(c.get("nights", 0) for c in cities)

        if not cities or duration == 0:
            return trip_state

        city_names = [c["name"] for c in cities]
        model = _LLM(model="gpt-4o-mini", temperature=0.3)
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
            import re as _re
            response = await model.ainvoke([{"role": "user", "content": prompt}])
            content = response.content if isinstance(response.content, str) else str(response.content)
            json_match = _re.search(r"\{[\s\S]*\}", content)
            if json_match:
                proposal = _json.loads(json_match.group())
            else:
                nights_per = max(1, duration // len(cities))
                proposal = {
                    "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                    "totalNights": duration,
                    "rationale": f"Even split of {nights_per} nights per city.",
                }
        except Exception as e:
            logger.error(f"[AUTO_ROUTE] LLM failed: {e}")
            nights_per = max(1, duration // len(cities))
            proposal = {
                "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                "totalNights": duration,
                "rationale": f"Even split of {nights_per} nights per city.",
            }

        trip_state = dict(trip_state)
        trip_state["routeProposal"] = proposal
        logger.info(f"[AUTO_ROUTE] Proposal: {_json.dumps(proposal)}")
        return trip_state

    async def _auto_build_itinerary(self, trip_state: dict) -> dict:
        """Auto-build itinerary directly using the itinerary builder service."""
        route_proposal = trip_state.get("routeProposal")
        cities = trip_state.get("cities", [])

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
            return trip_state

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

        try:
            result = await itinerary_builder.build(ctx)
            if result and result.get("itinerary"):
                trip_state = dict(trip_state)
                trip_state["itinerary"] = result["itinerary"]
                logger.info(f"[AUTO_ITINERARY] Built {len(result['itinerary'].get('days', []))} days")
        except Exception as e:
            logger.error(f"[AUTO_ITINERARY] Failed: {e}")

        return trip_state

    def _build_suggestions(self, trip_state: dict | None, slot_check: dict) -> list[str]:
        """Build suggestion chips based on current state."""
        if not slot_check["proceed"]:
            return []

        if not trip_state or not trip_state.get("routeProposal"):
            return ["Propose a route", "Tell me more about these cities"]

        if trip_state.get("routeProposal") and not trip_state.get("itinerary"):
            return ["Looks good, build it!", "I want to change the route"]

        if trip_state.get("itinerary"):
            return ["Add an activity", "Remove a day", "Tell me about the food scene"]

        return []


travel_agent = TravelAgent()
