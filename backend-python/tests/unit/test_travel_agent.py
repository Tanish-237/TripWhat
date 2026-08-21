"""Tests for the travel agent — agentic onboarding and streaming.

These tests verify the agentic behavior where the agent ALWAYS runs (no bypass).
The agent handles onboarding via check_trip_status and fill_trip_slot tools,
which write trip_state back to graph state via Command(update=...).

Tests use chat_stream() — the streaming async generator.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.agents.travel_agent import TravelAgent
from app.agents.state import create_default_trip_state, apply_slot_answer, SLOT_ORDER


@pytest.fixture
def agent():
    return TravelAgent()


async def _collect_stream(gen):
    """Collect all events from chat_stream async generator, return final payload."""
    events = []
    async for event in gen:
        events.append(event)
        if event.get("type") == "complete":
            return event.get("payload", {}), events
        if event.get("type") == "interrupt":
            return {"interrupted": True, "payload": event.get("payload")}, events
    return {}, events


def _build_full_state():
    """Build a trip state with all slots properly filled (including origin)."""
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", "Tokyo")
    state = apply_slot_answer(state, "dates", {"start": "2026-10-10", "end": "2026-10-17"})
    state = apply_slot_answer(state, "duration", 7)
    state = apply_slot_answer(state, "travelers", "solo")
    state = apply_slot_answer(state, "trip_style", "culture")
    state = apply_slot_answer(state, "help_with", "everything")
    state = apply_slot_answer(state, "origin", "San Francisco")
    return state


class _MockTextProjection:
    """Mock for the AsyncProjection returned by message_event.text."""
    def __init__(self, tokens):
        self._tokens = tokens

    def __aiter__(self):
        return self._iter()

    async def _iter(self):
        for t in self._tokens:
            yield t


class _MockStreamMessages:
    """Mock for the stream.messages projection from astream_events v3."""
    def __init__(self, tokens):
        self._tokens = tokens

    def __aiter__(self):
        return self._iter()

    async def _iter(self):
        for t in self._tokens:
            msg = MagicMock()
            msg.text = _MockTextProjection([t])
            msg.node = "model"
            yield msg


class _MockStream:
    """Mock for the AsyncGraphRunStream returned by astream_events(version='v3')."""
    def __init__(self, tokens, final_state=None, interrupted=False, interrupt_value=None):
        self.messages = _MockStreamMessages(tokens)
        self._final_state = final_state or {}
        self._interrupted = interrupted
        self._interrupt_value = interrupt_value

    async def interrupted(self):
        return self._interrupted

    async def interrupts(self):
        if self._interrupted:
            item = MagicMock()
            item.value = self._interrupt_value
            return [item]
        return []

    async def output(self):
        return self._final_state


@pytest.mark.asyncio
async def test_agent_always_invoked_onboarding(agent):
    """The agent is ALWAYS invoked, even during onboarding (no bypass).
    The agent calls check_trip_status and fill_trip_slot tools to handle onboarding."""
    mock_stream = _MockStream(
        tokens=["Where would you like to go?"],
        final_state={"trip_state": create_default_trip_state(), "messages": []},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)

    result, events = await _collect_stream(
        agent.chat_stream("I want to plan a trip", "conv-1")
    )

    agent._agent.astream_events.assert_called_once()
    assert result.get("response") == "Where would you like to go?"


@pytest.mark.asyncio
async def test_agent_invoked_with_trip_state_in_input(agent):
    """The agent receives trip_state in the input dict so tools can read it via InjectedState."""
    trip_state = create_default_trip_state()
    trip_state = apply_slot_answer(trip_state, "destination", "Tokyo")

    mock_stream = _MockStream(
        tokens=["When are you planning to travel?"],
        final_state={"trip_state": trip_state, "messages": []},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)

    await _collect_stream(
        agent.chat_stream("Tokyo", "conv-2", context={"tripState": trip_state})
    )

    call_args = agent._agent.astream_events.call_args
    input_arg = call_args[0][0]  # first positional arg
    # trip_state is managed by the checkpointer, not passed in input
    assert "messages" in input_arg
    assert any(m.get("content") == "Tokyo" for m in input_arg["messages"])


@pytest.mark.asyncio
async def test_agent_reads_updated_trip_state_from_stream_output(agent):
    """When tools update trip_state via Command(update=...), chat_stream reads it from stream.output()."""
    initial_state = create_default_trip_state()

    # Simulate the agent calling fill_trip_slot which updates trip_state
    updated_state = apply_slot_answer(initial_state, "destination", "Tokyo")

    mock_stream = _MockStream(
        tokens=["Great! When are you planning to travel?"],
        final_state={"trip_state": updated_state, "messages": []},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)

    result, events = await _collect_stream(
        agent.chat_stream("I want to go to Tokyo", "conv-3")
    )

    ts = result.get("tripState", {})
    assert "destination" in ts.get("onboarding", {}).get("slotsFilled", [])


@pytest.mark.asyncio
async def test_post_onboarding_invokes_agent(agent):
    """When all slots are filled (onboarding complete), the agent is invoked for chat/editing."""
    full_state = _build_full_state()
    full_state["itinerary"] = {"days": []}

    mock_stream = _MockStream(
        tokens=["Here's your itinerary update."],
        final_state={"trip_state": full_state, "messages": []},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)

    result, events = await _collect_stream(
        agent.chat_stream("Add a museum visit on day 2", "conv-4", context={"tripState": full_state})
    )

    agent._agent.astream_events.assert_called_once()
    assert result.get("response") == "Here's your itinerary update."


@pytest.mark.asyncio
async def test_interrupt_propagated(agent):
    """When the agent interrupts (e.g., route confirmation), chat_stream yields an interrupt event."""
    full_state = _build_full_state()

    mock_stream = _MockStream(
        tokens=["Here's your route:"],
        final_state={"trip_state": full_state, "messages": []},
        interrupted=True,
        interrupt_value={"type": "route_confirmation", "proposal": {"cities": []}},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)

    result, events = await _collect_stream(
        agent.chat_stream("propose a route", "conv-5", context={"tripState": full_state})
    )

    assert result.get("interrupted") is True
    assert result.get("payload", {}).get("type") == "route_confirmation"


@pytest.mark.asyncio
async def test_streaming_falls_back_to_invoke(agent):
    """When astream_events fails, chat_stream falls back to ainvoke."""
    full_state = _build_full_state()
    full_state["itinerary"] = {"days": []}

    mock_msg = MagicMock()
    mock_msg.type = "ai"
    mock_msg.content = "Fallback response."

    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(side_effect=Exception("stream error"))
    agent._agent.ainvoke = AsyncMock(return_value={
        "messages": [mock_msg],
        "trip_state": full_state,
    })

    result, events = await _collect_stream(
        agent.chat_stream("edit day 1", "conv-6", context={"tripState": full_state})
    )

    agent._agent.ainvoke.assert_called_once()
    assert result.get("response") == "Fallback response."


@pytest.mark.asyncio
async def test_auto_build_triggers_when_onboarding_completes(agent):
    """When the agent fills all slots (via tools), auto-build route/itinerary should trigger."""
    full_state = _build_full_state()
    state_with_route = dict(full_state)
    state_with_route["routeProposal"] = {"cities": [{"name": "Tokyo", "nights": 4, "order": 0}]}

    mock_stream = _MockStream(
        tokens=["All set! Let me build your trip."],
        final_state={"trip_state": full_state, "messages": []},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)
    agent._auto_propose_route = AsyncMock(return_value=state_with_route)
    agent._auto_build_itinerary = AsyncMock(return_value=state_with_route)

    result, events = await _collect_stream(
        agent.chat_stream("everything", "conv-7")
    )

    agent._auto_propose_route.assert_called_once()
    # itinerary auto-build should also trigger since route was proposed
    agent._auto_build_itinerary.assert_called_once()


@pytest.mark.asyncio
async def test_no_auto_build_when_itinerary_exists(agent):
    """When an itinerary already exists, auto-build should NOT trigger."""
    full_state = _build_full_state()
    full_state["itinerary"] = {"days": [{"day": 1}]}

    mock_stream = _MockStream(
        tokens=["Your itinerary looks good."],
        final_state={"trip_state": full_state, "messages": []},
    )
    agent._agent = MagicMock()
    agent._agent.astream_events = AsyncMock(return_value=mock_stream)
    agent._auto_propose_route = AsyncMock()
    agent._auto_build_itinerary = AsyncMock()

    await _collect_stream(
        agent.chat_stream("looks good", "conv-8", context={"tripState": full_state})
    )

    agent._auto_propose_route.assert_not_called()
    agent._auto_build_itinerary.assert_not_called()
