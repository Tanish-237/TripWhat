"""Travel agent — LangGraph Python create_agent with InjectedState tools.

LLM-driven flow: the agent reads trip_state via InjectedState and decides
what to ask (via ask_question) or when to build (via plan_trip + build_itinerary).
No fixed slot order, no interrupt-based route confirmation.
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
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver

from app.agents.prompts import DEEP_AGENT_SYSTEM_PROMPT
from app.agents.state import create_default_trip_state
from app.agents.state_schema import TravelAgentState
from app.agents.tools.plan_tools import plan_trip, ask_question
from app.agents.tools.search_tools import web_search
from app.agents.tools.itinerary_tools import build_itinerary, edit_itinerary
from app.agents.tools.calendar_tools import create_calendar_event
from app.agents.tools.memory_tools import remember_user_preference
from app.agents.tools.mcp_tools import (
    mcp_search_places, mcp_resolve_names, mcp_compute_routes, mcp_lookup_weather, mcp_find_nearby,
    init_search_results, get_search_results,
)
from app.services.itinerary_builder import itinerary_builder
from app.utils.logger import logger


async def _aon_tool_error(exc: Exception) -> str:
    """Async error handler for ToolErrorMiddleware."""
    return f"Tool error: {type(exc).__name__}. Please try a different approach."


class TravelAgent:
    """LangGraph-based travel agent with proper state persistence."""

    def __init__(self):
        self.model_name = "gpt-4o-mini"
        self.checkpointer = MemorySaver()
        self.store = None
        self._agent = None
        self._model = None
        self._tools = [
            plan_trip,
            ask_question,
            web_search,
            build_itinerary,
            edit_itinerary,
            create_calendar_event,
            remember_user_preference,
            mcp_search_places,
            mcp_resolve_names,
            mcp_compute_routes,
            mcp_lookup_weather,
            mcp_find_nearby,
        ]

    def set_persistence(self, checkpointer, store) -> None:
        """Wire in persistent checkpointer/store (called once from app lifespan)."""
        self.checkpointer = checkpointer
        self.store = store
        self._agent = None  # force agent rebuild with new persistence

    def _build_middleware(self) -> list:
        """Build the middleware stack for the agent."""
        onboarding_model = ChatOpenAI(model="gpt-4o", temperature=0.7)
        post_onboarding_model = ChatOpenAI(model=self.model_name, temperature=0.7)

        @wrap_model_call
        async def dynamic_model_selection(request: ModelRequest, handler) -> ModelResponse:
            """Route to the appropriate model + force tool calls during onboarding.

            - Use gpt-4o when no itinerary exists yet (stronger reasoning for
              parsing and flow decisions). Use gpt-4o-mini once the itinerary
              is built (cost-optimized for editing/chat).
            - Force tool_choice="any" on the first LLM step of each turn when
              we're still onboarding (no itinerary, missing dates or duration).
              This prevents the model from asking planning questions in plain
              text — it must call a tool (ask_question, plan_trip, web_search,
              etc.) instead. After the first tool call, the model can respond
              in text naturally.
            """
            trip_state = request.state.get("trip_state") or {}
            has_itinerary = bool(trip_state.get("itinerary"))

            if not has_itinerary:
                model = onboarding_model
            else:
                model = post_onboarding_model

            # Check if we should force tool calls
            overrides = {"model": model}

            if not has_itinerary:
                # Onboarding mode — force tool calls on the first LLM step
                # (latest message is a HumanMessage). This prevents the model
                # from asking planning questions in plain text — it must call
                # a tool (ask_question, plan_trip, web_search, etc.) instead.
                # After the first tool call, the model can respond in text.
                msgs = request.messages
                is_first_step = (
                    len(msgs) > 0
                    and isinstance(msgs[-1], HumanMessage)
                )

                if is_first_step:
                    # OpenAI uses "required" to force a tool call.
                    # LangChain's "any" should map to this, but we use
                    # "required" directly to be safe.
                    overrides["tool_choice"] = "required"
                    overrides["model_settings"] = {"parallel_tool_calls": False}
                    logger.info("[MIDDLEWARE] Forcing tool_choice=required (onboarding, first step)")

            return await handler(request.override(**overrides))

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

    # ------------------------------------------------------------------
    # Tool activity helpers — produce human-readable labels and result
    # summaries for the frontend's tool activity bar.
    # ------------------------------------------------------------------

    _TOOL_LABELS: dict[str, str] = {
        "plan_trip": "Planning your trip",
        "ask_question": "Preparing a question",
        "web_search": "Searching the web",
        "build_itinerary": "Building itinerary",
        "edit_itinerary": "Editing itinerary",
        "create_calendar_event": "Adding calendar event",
        "remember_user_preference": "Saving your preference",
        "mcp_search_places": "Searching places",
        "mcp_resolve_names": "Resolving place names",
        "mcp_compute_routes": "Computing routes",
        "mcp_lookup_weather": "Checking weather",
        "mcp_find_nearby": "Finding nearby places",
    }

    @classmethod
    def _tool_label(cls, tool_name: str, tool_input: dict | None) -> str:
        """Generate a dynamic, human-readable label for a tool call."""
        base = cls._TOOL_LABELS.get(tool_name, tool_name.replace("_", " ").title())
        if not tool_input:
            return base

        # Enrich with input context for the most user-facing tools
        if tool_name == "mcp_search_places":
            query = tool_input.get("text_query") or tool_input.get("query") or ""
            city = tool_input.get("city") or tool_input.get("location") or ""
            parts = [p for p in [query, city] if p]
            return f"Searching {': '.join(parts)}" if parts else base
        elif tool_name == "mcp_find_nearby":
            place = tool_input.get("place_name") or tool_input.get("place_id") or ""
            kind = tool_input.get("place_type") or tool_input.get("type") or "places"
            return f"Finding {kind} near {place}" if place else base
        elif tool_name == "mcp_compute_routes":
            origin = tool_input.get("origin") or ""
            dest = tool_input.get("destination") or ""
            if origin and dest:
                return f"Computing route: {origin} → {dest}"
            return base
        elif tool_name == "mcp_lookup_weather":
            city = tool_input.get("city") or tool_input.get("location") or ""
            return f"Checking weather in {city}" if city else base
        elif tool_name == "web_search":
            query = tool_input.get("query") or ""
            return f"Searching the web: {query}" if query else base
        elif tool_name == "plan_trip":
            dest = tool_input.get("destination") or ""
            return f"Planning trip to {dest}" if dest else base
        elif tool_name == "build_itinerary":
            city = tool_input.get("city") or ""
            return f"Building itinerary for {city}" if city else base
        return base

    @staticmethod
    def _tool_result_summary(tool_name: str, tool_input: dict | None, output: any) -> str:
        """Generate a short summary of a tool's result for the collapsed bar."""
        if output is None:
            return ""

        # Tool outputs can be strings (most tools) or dicts (some MCP tools)
        if isinstance(output, str):
            text = output.strip()
        elif isinstance(output, dict):
            # MCP search tools may return a dict with 'places' or 'results'
            if "places" in output:
                count = len(output["places"]) if isinstance(output["places"], list) else 0
                return f"{count} places found"
            if "results" in output:
                count = len(output["results"]) if isinstance(output["results"], list) else 0
                return f"{count} results found"
            if "routes" in output:
                count = len(output["routes"]) if isinstance(output["routes"], list) else 0
                return f"{count} routes found"
            text = str(output)
        else:
            text = str(output)

        # Try to extract a count from string output
        if "found" in text.lower():
            # e.g. "Found 10 hotels" → use as-is
            return text[:80]
        # Truncate long outputs
        return text[:80] + ("…" if len(text) > 80 else "")

    async def chat_stream(self, message: str, conversation_id: str, context: dict | None = None):
        """Stream agent responses token-by-token, yielding structured events.

        Yields dicts with "type" key:
          - {"type": "token", "text": "..."} — LLM token delta
          - {"type": "status", "status": "..."} — progress update
          - {"type": "widget", "widget": {...}} — widget to render (e.g., question_card)
          - {"type": "tripState", "tripState": {...}} — partial state update
          - {"type": "complete", "payload": {...}} — final result
        """
        context = context or {}
        trip_state = context.get("tripState")

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
        pending_widget = None

        # Reset the search results buffer
        init_search_results()

        config = {
            "configurable": {"thread_id": conversation_id, "user_id": context.get("userId")},
            "metadata": {
                "conversation_id": conversation_id,
                "user_id": context.get("userId", ""),
                "app": "tripwhat",
            },
        }

        # Clear any stale _pendingWidget from the checkpoint state.
        # The ask_question tool sets _pendingWidget in trip_state, which gets
        # saved by the checkpointer. On the next turn, the checkpoint still has
        # it — we need to explicitly null it out so the merge reducer overwrites
        # the stale value. Otherwise the old question card reappears.
        clean_trip_state = dict(final_trip_state)
        clean_trip_state["_pendingWidget"] = None

        try:
            stream = await self.agent.astream_events(
                {"messages": messages, "trip_state": clean_trip_state},
                config=config, version="v3"
            )

            # Consume messages and tool_calls concurrently.
            # We use a queue so the generator can yield events from both
            # projections in the order they arrive.
            import asyncio as _aio
            event_queue: _aio.Queue = _aio.Queue()

            async def _consume_messages():
                """Consume LLM token deltas from stream.messages."""
                try:
                    async for message_event in stream.messages:
                        if message_event.node != "model":
                            async for _ in message_event.text:
                                pass
                            continue
                        async for delta in message_event.text:
                            if delta:
                                await event_queue.put({"type": "token", "text": delta})
                except Exception as e:
                    await event_queue.put({"type": "_error", "error": e})

            async def _consume_tool_calls():
                """Consume tool execution lifecycle from stream.tool_calls."""
                try:
                    async for call in stream.tool_calls:
                        label = self._tool_label(call.tool_name, call.input if isinstance(call.input, dict) else None)
                        await event_queue.put({
                            "type": "tool_start",
                            "tool_name": call.tool_name,
                            "label": label,
                            "call_id": getattr(call, "call_id", None) or getattr(call, "id", None) or "",
                            "input": call.input if isinstance(call.input, dict) else None,
                        })
                        # Consume output deltas (we don't stream these to the
                        # frontend, but we must drain them to drive the
                        # projection forward)
                        async for _ in call.output_deltas:
                            pass
                        # Get final output and error
                        output = None
                        error = None
                        try:
                            output = call.output
                        except Exception as e:
                            error = str(e)
                        if not error and hasattr(call, "error") and call.error:
                            error = str(call.error)
                        summary = self._tool_result_summary(call.tool_name, call.input if isinstance(call.input, dict) else None, output)
                        await event_queue.put({
                            "type": "tool_end",
                            "tool_name": call.tool_name,
                            "label": label,
                            "call_id": getattr(call, "call_id", None) or getattr(call, "id", None) or "",
                            "summary": summary,
                            "error": error,
                        })
                except Exception as e:
                    await event_queue.put({"type": "_error", "error": e})

            # Run both consumers concurrently; we collect into a done flag
            consumers = _aio.gather(_consume_messages(), _consume_tool_calls())

            # Yield events from the queue as they arrive
            while True:
                try:
                    event = await _aio.wait_for(event_queue.get(), timeout=0.1)
                except _aio.TimeoutError:
                    # Check if both consumers are done
                    if consumers.done():
                        # Drain any remaining events
                        while not event_queue.empty():
                            event = event_queue.get_nowait()
                            if event.get("type") == "_error":
                                raise event["error"]
                            if event["type"] == "token":
                                response_text += event["text"]
                            yield event
                        break
                    continue
                if event.get("type") == "_error":
                    raise event["error"]
                if event["type"] == "token":
                    response_text += event["text"]
                yield event

            # Await the gather to surface any exceptions
            await consumers

            # Read the final state from the stream
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

        # Emit pending widget (from ask_question tool) if present.
        # Save it so we can also include it in the complete payload's widgets —
        # this lets the frontend's processResponse know that this turn called
        # ask_question, so it doesn't clear activeWidget prematurely.
        pending_widget = final_trip_state.pop("_pendingWidget", None)
        if pending_widget:
            yield {"type": "widget", "widget": pending_widget}

        if not response_text:
            response_text = "I apologize, but I had trouble processing your request."

        # Auto-build itinerary when plan_trip has set a route but no itinerary yet
        if final_trip_state.get("routeProposal") and not final_trip_state.get("itinerary"):
            yield {"type": "status", "status": "Building your itinerary..."}

            import asyncio as _aio
            status_queue: _aio.Queue = _aio.Queue()
            _build_call_counter = [0]

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
                elif phase == "day_complete":
                    day_num = update.get("day", 0)
                    city = update.get("city", "")
                    total = update.get("totalDays", 0)
                    msg = f"Day {day_num} of {total} ready in {city}"
                    await status_queue.put({"type": "status", "status": msg})
                    # Also emit as tool_start/tool_end so the activity bar shows it
                    _build_call_counter[0] += 1
                    call_id = f"build_day_{day_num}"
                    await status_queue.put({
                        "type": "tool_start",
                        "tool_name": "itinerary_build_day",
                        "label": f"Building Day {day_num} in {city}",
                        "call_id": call_id,
                        "input": {"day": day_num, "city": city},
                    })
                    await status_queue.put({
                        "type": "tool_end",
                        "tool_name": "itinerary_build_day",
                        "label": f"Day {day_num} ready",
                        "call_id": call_id,
                        "summary": f"Day {day_num} of {total}",
                        "error": None,
                    })
                    # Emit the day data as a new event type for progressive rendering
                    await status_queue.put({
                        "type": "itinerary_day",
                        "day": update.get("day"),
                        "city": update.get("city"),
                        "timeSlots": update.get("timeSlots"),
                        "totalDays": update.get("totalDays"),
                    })
                elif phase == "build_complete":
                    msg = "Finalizing your itinerary..."
                if msg:
                    await status_queue.put({"type": "status", "status": msg})
                    # Also emit as tool_start/tool_end so the activity bar shows it
                    _build_call_counter[0] += 1
                    call_id = f"build_{_build_call_counter[0]}"
                    await status_queue.put({
                        "type": "tool_start",
                        "tool_name": f"itinerary_build_{phase}",
                        "label": msg.rstrip("."),
                        "call_id": call_id,
                        "input": update,
                    })
                    await status_queue.put({
                        "type": "tool_end",
                        "tool_name": f"itinerary_build_{phase}",
                        "label": msg.rstrip("."),
                        "call_id": call_id,
                        "summary": "",
                        "error": None,
                    })

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
            while not status_queue.empty():
                yield await status_queue.get()
            final_trip_state = await build_task
            if final_trip_state.get("itinerary"):
                response_text = "I've put together your itinerary! Check it out on the right — you can ask me to adjust anything."
            yield {"type": "tripState", "tripState": final_trip_state}

        itinerary = None
        if final_trip_state and final_trip_state.get("itinerary"):
            itinerary = final_trip_state["itinerary"]

        search_results = get_search_results()
        widgets = self._build_widgets(final_trip_state, search_results)
        # Include the pending question widget in the complete payload so the
        # frontend can know this turn called ask_question (and not clear
        # activeWidget). The agent:widget event already fired above, but
        # including it here lets processResponse make the right decision.
        if pending_widget:
            widgets = [pending_widget] + widgets
        suggestions = self._build_suggestions(final_trip_state)

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

    def _build_widgets(self, trip_state: dict | None, search_results: list | None = None) -> list[dict]:
        """Build UI widgets based on current state."""
        widgets = []

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
                    "highlights": [
                        h for day in itinerary.get("days", [])[:4]
                        for h in (day.get("highlights") or [])[:2]
                    ][:6],
                },
            })

            # Emit flight cards as separate widgets for inline chat rendering
            flights = itinerary.get("flightOptions", [])
            if flights:
                for flight in flights[:2]:  # top 2 flights
                    widgets.append({
                        "type": "flight_card",
                        "data": flight,
                    })

        # Show search results widget when places were found via mcp_search_places
        # but no itinerary was built (i.e., search/recommendation turns).
        if search_results and not (trip_state or {}).get("itinerary"):
            places = []
            seen_ids = set()
            for p in search_results:
                pid = p.get("placeId") or p.get("id") or ""
                name = p.get("name", "")
                if not name or pid in seen_ids:
                    continue
                seen_ids.add(pid)
                places.append({
                    "name": name,
                    "placeId": pid,
                    "imageUrl": p.get("photo_url") or p.get("imageUrl") or "",
                    "rating": p.get("rating"),
                    "type": ", ".join((p.get("types") or [])[:2]),
                    "address": p.get("address", ""),
                })
                if len(places) >= 8:
                    break
            if places:
                widgets.append({
                    "type": "search_results",
                    "data": {"places": places},
                })

        return widgets

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

        if user_memories:
            ctx["userMemories"] = user_memories
        if traveler_type:
            ctx["travelerType"] = traveler_type
        if user_interests:
            ctx["userInterests"] = user_interests

        start_location = trip_state.get("startLocation")
        if start_location:
            ctx["startLocation"] = start_location

        dates = trip_state.get("dates")
        if dates and dates.get("start"):
            ctx["startDate"] = dates["start"]

        travel_mode = trip_state.get("travelMode")
        if travel_mode:
            ctx["travelMode"] = travel_mode

        try:
            result = await itinerary_builder.build(ctx, status_cb=status_cb)
            if result and result.get("itinerary"):
                trip_state = dict(trip_state)
                trip_state["itinerary"] = result["itinerary"]
                logger.info(f"[AUTO_ITINERARY] Built {len(result['itinerary'].get('days', []))} days")
        except Exception as e:
            logger.error(f"[AUTO_ITINERARY] Failed: {e}")

        return trip_state

    def _build_suggestions(self, trip_state: dict | None) -> list[str]:
        """Build suggestion chips based on current state."""
        if not trip_state:
            return ["Plan a 5-day Japan trip", "Weekend in Paris", "Beach vacation in Bali"]

        if not trip_state.get("routeProposal"):
            return ["Plan a route", "Tell me more about these cities"]

        if trip_state.get("routeProposal") and not trip_state.get("itinerary"):
            return ["Build the itinerary", "I want to change the route"]

        if trip_state.get("itinerary"):
            return ["Add an activity", "Remove a day", "Tell me about the food scene"]

        return []


travel_agent = TravelAgent()
