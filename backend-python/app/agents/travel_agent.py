"""Travel agent — LangGraph Python create_agent with InjectedState tools.

This replaces both travel-agent.ts (70KB LangGraph StateGraph) and
deep-travel-agent.ts (10KB JS deep agent with broken state).

Key fix: Python's InjectedState annotation lets tools read/write agent
state natively. Persistence is handled by AsyncPostgresSaver (wired in
from app lifespan; falls back to MemorySaver) per conversation_id
(thread_id). A Postgres-backed store holds long-term user preferences
across conversations. No mutable context hacks needed.
"""


from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain.agents.middleware import (
    ToolErrorMiddleware,
    ModelCallLimitMiddleware,
    wrap_model_call,
    ModelRequest,
    ModelResponse,
)
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app.agents.prompts import DEEP_AGENT_SYSTEM_PROMPT
from app.agents.state import check_slots, SLOT_ORDER, create_default_trip_state
from app.agents.state_schema import TravelAgentState
from app.agents.tools.slot_tools import check_trip_status, fill_trip_slot
from app.agents.tools.search_tools import web_search
from app.agents.tools.route_tools import propose_route
from app.agents.tools.itinerary_tools import build_itinerary, edit_itinerary
from app.agents.tools.calendar_tools import create_calendar_event
from app.agents.tools.memory_tools import remember_user_preference
from app.agents.tools.mcp_tools import mcp_search_places, mcp_resolve_names, mcp_compute_routes, mcp_lookup_weather
from app.services.itinerary_builder import itinerary_builder
from app.utils.logger import logger


async def _aon_tool_error(exc: Exception) -> str:
    """Async error handler for ToolErrorMiddleware."""
    return f"Tool error: {type(exc).__name__}. Please try a different approach."


class TravelAgent:
    """LangGraph-based travel agent with proper state persistence."""

    def __init__(self):
        self.model_name = "gpt-4o-mini"
        # Default in-memory checkpointer; replaced by AsyncPostgresSaver
        # from the app lifespan via set_persistence().
        self.checkpointer = MemorySaver()
        self.store = None
        self._agent = None
        self._model = None
        self._tools = [
            check_trip_status,
            fill_trip_slot,
            web_search,
            propose_route,
            build_itinerary,
            edit_itinerary,
            create_calendar_event,
            remember_user_preference,
            mcp_search_places,
            mcp_resolve_names,
            mcp_compute_routes,
            mcp_lookup_weather,
        ]

    def set_persistence(self, checkpointer, store) -> None:
        """Wire in persistent checkpointer/store (called once from app lifespan)."""
        self.checkpointer = checkpointer
        self.store = store
        self._agent = None  # force agent rebuild with new persistence

    def _build_middleware(self) -> list:
        """Build the middleware stack for the agent."""
        # Dynamic model selection: gpt-4o for onboarding (parsing-critical),
        # gpt-4o-mini for post-onboarding chat (cost-optimized).
        onboarding_model = ChatOpenAI(model="gpt-4o", temperature=0.7)
        post_onboarding_model = ChatOpenAI(model=self.model_name, temperature=0.7)

        @wrap_model_call
        async def dynamic_model_selection(request: ModelRequest, handler) -> ModelResponse:
            """Route to the appropriate model based on trip_state.

            Inspects trip_state in graph state to determine if the user is
            still in onboarding (needs stronger reasoning) or post-onboarding
            (can use a cheaper model).
            """
            trip_state = request.state.get("trip_state") or {}
            onboarding = trip_state.get("onboarding", {})
            slots_filled = onboarding.get("slotsFilled", [])
            has_itinerary = bool(trip_state.get("itinerary"))

            # Onboarding phase: use onboarding model
            # Post-onboarding: use post-onboarding model
            if not has_itinerary and len(slots_filled) < len(SLOT_ORDER):
                model = onboarding_model
            else:
                model = post_onboarding_model

            return await handler(request.override(model=model))

        return [
            dynamic_model_selection,
            ToolErrorMiddleware(aon_error=lambda exc, request: _aon_tool_error(exc)),
            ModelCallLimitMiddleware(run_limit=10),
        ]

    @property
    def agent(self):
        if self._agent is None:
            self._agent = create_agent(
                model=ChatOpenAI(model=self.model_name, temperature=0.7),
                tools=self._tools,
                system_prompt=DEEP_AGENT_SYSTEM_PROMPT,
                state_schema=TravelAgentState,
                middleware=self._build_middleware(),
                checkpointer=self.checkpointer,
                store=self.store,
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

        # Build messages: only the new user message + preferences context.
        # The LangGraph checkpointer restores previous messages and trip_state
        # from the same thread_id — do NOT replay history as messages (causes
        # duplication) and do NOT pass trip_state in input (overwrites checkpoint).
        messages = []

        prefs_context = self._build_preferences_context(
            context.get("userPreferences"), context.get("userMemories")
        )
        if prefs_context:
            messages.append({"role": "system", "content": prefs_context})
        messages.append({"role": "user", "content": message})

        logger.info(f"[AGENT_STREAM] Processing: {message!r} (conv={conversation_id})")

        final_trip_state = trip_state or create_default_trip_state()
        response_text = ""

        config = {
            "configurable": {"thread_id": conversation_id, "user_id": context.get("userId")},
            "metadata": {
                "conversation_id": conversation_id,
                "user_id": context.get("userId", ""),
                "app": "tripwhat",
            },
        }

        # Check if the graph is in an interrupted state (e.g., route confirmation).
        # If so, resume the interrupt with the user's message as the decision,
        # instead of starting a new turn.
        try:
            state_snapshot = await self.agent.aget_state(config)
            has_interrupt = any(
                task.interrupts for task in (state_snapshot.tasks or [])
            )
            if has_interrupt:
                logger.info("[AGENT_STREAM] Detected pending interrupt, will resume")
        except Exception as e:
            logger.warning(f"[AGENT_STREAM] Failed to check interrupt state: {e}")
            has_interrupt = False

        if has_interrupt:
            # Resume from interrupt — pass the user's message as the resume value.
            # The propose_route tool will interpret this as confirmation/rejection.
            # Use word-boundary matching to avoid false positives (e.g., "ok" in "Tokyo").
            import re
            msg_lower = message.lower()
            # Check for explicit rejection first
            rejected = re.search(r'\b(no|nope|reject|change|modify|different|not really)\b', msg_lower) is not None
            if rejected:
                confirmed = False
            else:
                confirmed = any(re.search(r'\b' + re.escape(w) + r'\b', msg_lower) for w in
                    ["yes", "confirm", "looks good", "build", "great", "perfect", "ok", "sure", "approve", "go ahead", "do it"])
            resume_value = {"confirmed": confirmed, "message": message}
            logger.info(f"[AGENT_STREAM] Resuming interrupt with confirmed={confirmed}, agent={self.agent is not None}")

            # Use ainvoke (not astream_events) with Command(resume=...) — v3 events
            # protocol doesn't support Command input, and astream yields middleware
            # chunks not the final state. ainvoke returns the full result.
            try:
                result = await self.agent.ainvoke(
                    Command(resume=resume_value),
                    config=config,
                )
                if result and isinstance(result, dict):
                    updated_trip_state = result.get("trip_state")
                    if updated_trip_state:
                        final_trip_state = updated_trip_state
                    # Extract the last AI message text
                    msgs = result.get("messages", [])
                    for msg in reversed(msgs):
                        if hasattr(msg, "type") and msg.type == "ai":
                            content = msg.content if isinstance(msg.content, str) else str(msg.content)
                            if content and content.strip():
                                response_text = content.strip()
                                yield {"type": "token", "text": response_text}
                                break

                # Check if a new interrupt was triggered (e.g., re-proposed route)
                new_state = await self.agent.aget_state(config)
                new_interrupts = any(task.interrupts for task in (new_state.tasks or []))
                if new_interrupts:
                    # Get the interrupt info
                    for task in (new_state.tasks or []):
                        if task.interrupts:
                            interrupt_info = task.interrupts[0].value
                            if isinstance(interrupt_info, dict):
                                interrupt_info["tripState"] = final_trip_state
                            yield {"type": "interrupt", "payload": interrupt_info}
                            return

            except Exception as e:
                logger.error(f"[AGENT_STREAM] Resume failed: {e}", exc_info=True)
                response_text = "I'm sorry, I had trouble resuming your trip planning. Could you repeat your request?"

        else:
            try:
                stream = await self.agent.astream_events(
                    {"messages": messages},
                    config=config, version="v3"
                )

                async for message_event in stream.messages:
                    # Only stream text from the model node — tools node text is
                    # internal LLM calls (e.g., propose_route's route generation)
                    # that should not be shown to the user.
                    if message_event.node != "model":
                        # Still consume the projection to drive the stream forward
                        async for _ in message_event.text:
                            pass
                        continue
                    # message_event.text is an AsyncProjection — async iterable of deltas
                    async for delta in message_event.text:
                        if delta:
                            yield {"type": "token", "text": delta}
                            response_text += delta

                # Check for interrupts (e.g., route confirmation)
                is_interrupted = await stream.interrupted()
                if is_interrupted:
                    interrupts = await stream.interrupts()
                    interrupt_info = interrupts[0].value if interrupts else {}
                    # Get the current trip_state from the stream output
                    # so it can be saved to DB for the resume turn
                    try:
                        interrupt_output = await stream.output()
                        if interrupt_output and isinstance(interrupt_output, dict):
                            interrupt_ts = interrupt_output.get("trip_state")
                            if interrupt_ts:
                                interrupt_info["tripState"] = interrupt_ts
                    except Exception:
                        pass
                    yield {"type": "interrupt", "payload": interrupt_info}
                    return

                # Read the final state from the stream — tools may have updated trip_state
                final_output = await stream.output()
                if final_output and isinstance(final_output, dict):
                    updated_trip_state = final_output.get("trip_state")
                    if updated_trip_state:
                        final_trip_state = updated_trip_state

            except Exception as e:
                logger.error(f"[AGENT_STREAM] Streaming failed, falling back to invoke: {e}")
                result = await self.agent.ainvoke(
                    {"messages": messages, "trip_state": final_trip_state},
                    config=config,
                )
                ai_messages = [m for m in result.get("messages", []) if m.type == "ai"]
                for msg in reversed(ai_messages):
                    content = msg.content if isinstance(msg.content, str) else str(msg.content)
                    if content and content.strip():
                        response_text = content.strip()
                        break
                if isinstance(result, dict):
                    updated_trip_state = result.get("trip_state")
                    if updated_trip_state:
                        final_trip_state = updated_trip_state

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

                # Use a queue to stream granular build status events in real time.
                import asyncio as _aio
                status_queue: _aio.Queue = _aio.Queue()

                async def _build_status_cb(update: dict):
                    phase = update.get("phase", "")
                    msg = ""
                    if phase == "activities":
                        city = update.get("city", "")
                        msg = f"Finding activities in {city}..."
                    elif phase == "hotels_restaurants":
                        cities = update.get("cities") or [update.get("city", "")]
                        cities_str = ", ".join(c for c in cities if c)
                        msg = f"Searching hotels & restaurants in {cities_str}..."
                    elif phase == "flights":
                        msg = "Searching flights..."
                    elif phase == "build_complete":
                        msg = "Finalizing your itinerary..."
                    if msg:
                        await status_queue.put({"type": "status", "status": msg})

                # Run the build as a task so we can drain status events concurrently.
                build_task = _aio.create_task(
                    self._auto_build_itinerary(
                        final_trip_state,
                        status_cb=_build_status_cb,
                        user_memories=context.get("userMemories"),
                        traveler_type=(trip_state or {}).get("travelers") if isinstance((trip_state or {}).get("travelers"), str) else None,
                        user_interests=context.get("userInterests"),
                    )
                )
                while not build_task.done():
                    try:
                        event = await _aio.wait_for(status_queue.get(), timeout=0.5)
                        yield event
                    except _aio.TimeoutError:
                        pass
                # Drain any remaining events.
                while not status_queue.empty():
                    yield await status_queue.get()
                final_trip_state = await build_task
                if final_trip_state.get("itinerary"):
                    response_text = "I've put together your itinerary! Check it out on the right — you can ask me to adjust anything."
                yield {"type": "tripState", "tripState": final_trip_state}

        itinerary = None
        if final_trip_state and final_trip_state.get("itinerary"):
            itinerary = final_trip_state["itinerary"]

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

    def _build_preferences_context(self, preferences: dict | None, memories: list[str] | None) -> str:
        """Build a system context string with the user's long-term profile/preferences."""
        parts = []
        if preferences:
            pref_strs = [f"{k}: {v}" for k, v in preferences.items() if v]
            if pref_strs:
                parts.append("User profile preferences: " + "; ".join(pref_strs))
        if memories:
            parts.append("Remembered user preferences (from past trips):")
            parts.extend(f"  - {m}" for m in memories)
        if not parts:
            return ""
        parts.append("Use these to personalize recommendations. When the user reveals a new "
                     "durable preference, save it with remember_user_preference.")
        return "\n".join(parts)

    def _build_widgets(self, trip_state: dict | None, slot_check: dict) -> list[dict]:
        """Build UI widgets based on current state."""
        widgets = []

        # Only show the question card when the user is actively in the
        # planning flow — i.e., at least one slot is already filled. This
        # prevents the card from appearing on question/search/chitchat turns
        # where no slots have been filled yet.
        filled = slot_check.get("filledSlots", [])
        if filled and not slot_check["proceed"] and slot_check["questions"]:
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

        # Show itinerary summary widget when itinerary is built
        itinerary = (trip_state or {}).get("itinerary")
        if itinerary:
            hotels = itinerary.get("hotelRecommendations", [])
            best_hotel = hotels[0] if hotels else None

            # Collect top attractions with photos from the itinerary days
            attractions = []
            seen_names = set()
            for day in itinerary.get("days", []):
                for slot in day.get("timeSlots", []):
                    for act in slot.get("activities", [slot.get("activity")]):
                        if not act:
                            continue
                        name = act.get("name", "")
                        img = act.get("imageUrl") or (act.get("photos") or [None])[0]
                        if name and img and name not in seen_names:
                            seen_names.add(name)
                            attractions.append({
                                "name": name,
                                "imageUrl": img,
                                "type": act.get("type", ""),
                                "placeId": act.get("placeId", ""),
                                "rating": act.get("rating"),
                            })
                        if len(attractions) >= 6:
                            break
                    if len(attractions) >= 6:
                        break
                if len(attractions) >= 6:
                    break

            widgets.append({
                "type": "itinerary_summary",
                "data": {
                    "hotel": {
                        "name": best_hotel.get("name", ""),
                        "imageUrl": best_hotel.get("imageUrl", ""),
                        "images": best_hotel.get("images", []),
                        "rating": best_hotel.get("rating"),
                        "ratePerNight": best_hotel.get("ratePerNight"),
                        "totalRate": best_hotel.get("totalRate"),
                        "currency": best_hotel.get("currency", "USD"),
                        "whyPicked": best_hotel.get("whyPicked", ""),
                        "bookingLink": best_hotel.get("bookingLink", ""),
                        "placeId": best_hotel.get("placeId", ""),
                        "address": best_hotel.get("address", ""),
                    } if best_hotel else None,
                    "attractions": attractions,
                    "destination": (trip_state or {}).get("cities", [{}])[0].get("name", ""),
                    "duration": (trip_state or {}).get("duration", 0),
                    "dates": (trip_state or {}).get("dates", {}),
                    "preferences": (trip_state or {}).get("preferences", []),
                    # Day-level highlights from the itinerary for the summary text
                    "highlights": [
                        h for day in itinerary.get("days", [])[:4]
                        for h in (day.get("highlights") or [])[:2]
                    ][:6],
                },
            })

        return widgets

    async def _auto_propose_route(self, trip_state: dict) -> dict:
        """Auto-generate a route proposal using the route tool logic directly."""
        import json as _json
        from langchain_openai import ChatOpenAI as _LLM

        cities = trip_state.get("cities", [])

        # Calculate total nights: prefer sum of city nights, fall back to duration field.
        duration = sum(c.get("nights", 0) for c in cities)
        if duration == 0:
            duration = trip_state.get("duration", 0)
        # Convert days to nights (3 days = 2 nights)
        total_nights = max(1, duration - 1) if duration > 1 else 1

        if not cities or total_nights == 0:
            return trip_state

        city_names = [c["name"] for c in cities]
        model = _LLM(model="gpt-4o-mini", temperature=0.3)
        prompt = f"""\
You are a travel route planner. Given these cities: {city_names}
Total nights available: {total_nights}

Propose a route with night splits per city. Consider:
- Logical geographic order (minimize travel time)
- Popular cities deserve more nights
- First and last cities may need fewer nights (arrival/departure)

Respond with ONLY a JSON object:
{{
  "cities": [{{"name": "CityName", "nights": N, "order": 0}}],
  "totalNights": {total_nights},
  "rationale": "Brief explanation of the route"
}}
"""
        try:
            import re as _re
            response = await model.ainvoke([{"role": "user", "content": prompt}])
            content = response.content if isinstance(response.content, str) else str(response.content)
            # Strip markdown code fences if present
            content = _re.sub(r"^```(?:json)?\s*", "", content.strip())
            content = _re.sub(r"\s*```\s*$", "", content)
            json_match = _re.search(r"\{[\s\S]*\}", content)
            if json_match:
                proposal = _json.loads(json_match.group())
            else:
                nights_per = max(1, total_nights // len(cities))
                proposal = {
                    "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                    "totalNights": total_nights,
                    "rationale": f"Even split of {nights_per} nights per city.",
                }
        except Exception as e:
            logger.error(f"[AUTO_ROUTE] LLM failed: {e}")
            nights_per = max(1, total_nights // len(cities))
            proposal = {
                "cities": [{"name": c["name"], "nights": nights_per, "order": i} for i, c in enumerate(cities)],
                "totalNights": total_nights,
                "rationale": f"Even split of {nights_per} nights per city.",
            }

        trip_state = dict(trip_state)
        trip_state["routeProposal"] = proposal
        logger.info(f"[AUTO_ROUTE] Proposal: {_json.dumps(proposal)}")
        return trip_state

    async def _auto_build_itinerary(self, trip_state: dict, status_cb=None, user_memories=None, traveler_type=None, user_interests=None) -> dict:
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

        # Pass personalization params if available
        if user_memories:
            ctx["userMemories"] = user_memories
        if traveler_type:
            ctx["travelerType"] = traveler_type
        if user_interests:
            ctx["userInterests"] = user_interests

        # Pass startLocation for flight search if available
        start_location = trip_state.get("startLocation")
        if start_location:
            ctx["startLocation"] = start_location

        dates = trip_state.get("dates")
        if dates and dates.get("start"):
            ctx["startDate"] = dates["start"]

        try:
            result = await itinerary_builder.build(ctx, status_cb=status_cb)
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
