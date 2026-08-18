"""Tests for the travel agent — onboarding skip and infinite loop prevention.

These tests verify the fix for the agent infinite loop bug where fill_trip_slot
always saw None for trip_state (because create_agent was never given a
state_schema with trip_state). The fix skips agent invocation during onboarding
and relies on pre-parse + fallback parser for slot filling.

Tests use chat_stream() — the streaming async generator that replaced chat().
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


@pytest.mark.asyncio
async def test_onboarding_skips_agent_invocation(agent):
    """During onboarding (slots missing), the agent should NOT be invoked.
    Only pre-parse + fallback parser should run."""
    agent._pre_parse_initial_message = AsyncMock(return_value=None)
    mock_agent_invoke = AsyncMock()
    agent._agent = MagicMock()
    agent._agent.ainvoke = mock_agent_invoke

    with patch("app.agents.travel_agent.slot_parser") as mock_parser:
        mock_parser.parse = AsyncMock(return_value="Tokyo")
        result, events = await _collect_stream(
            agent.chat_stream("I want to go to Tokyo", "conv-1")
        )

    mock_agent_invoke.assert_not_called()
    assert result.get("response")
    ts = result.get("tripState", {})
    assert "destination" in ts.get("onboarding", {}).get("slotsFilled", [])


@pytest.mark.asyncio
async def test_onboarding_fallback_parser_fills_slot(agent):
    """Fallback parser should fill the first missing slot during onboarding."""
    trip_state = create_default_trip_state()
    trip_state = apply_slot_answer(trip_state, "destination", "Tokyo")
    trip_state = apply_slot_answer(trip_state, "dates", "flexible")

    agent._pre_parse_initial_message = AsyncMock(return_value=trip_state)
    mock_agent_invoke = AsyncMock()
    agent._agent = MagicMock()
    agent._agent.ainvoke = mock_agent_invoke

    with patch("app.agents.travel_agent.slot_parser") as mock_parser:
        mock_parser.parse = AsyncMock(return_value=7)
        result, events = await _collect_stream(
            agent.chat_stream("7 days", "conv-2", context={"tripState": trip_state})
        )

    mock_agent_invoke.assert_not_called()
    ts = result.get("tripState", {})
    assert "duration" in ts.get("onboarding", {}).get("slotsFilled", [])


@pytest.mark.asyncio
async def test_onboarding_completes_auto_builds_route(agent):
    """When all slots are filled via pre-parse, auto-build route/itinerary should trigger.
    The agent IS invoked (post-onboarding), but auto-build should also run."""
    full_state = create_default_trip_state()
    for slot in SLOT_ORDER:
        full_state = apply_slot_answer(full_state, slot, "test")
    state_with_route = dict(full_state)
    state_with_route["routeProposal"] = {"cities": [{"name": "Tokyo", "nights": 4, "order": 0}]}
    agent._pre_parse_initial_message = AsyncMock(return_value=full_state)
    agent._auto_propose_route = AsyncMock(return_value=state_with_route)
    agent._auto_build_itinerary = AsyncMock(return_value=state_with_route)

    mock_msg = MagicMock()
    mock_msg.type = "ai"
    mock_msg.content = "Your trip is ready!"
    mock_agent = MagicMock()
    mock_agent.ainvoke = AsyncMock(return_value={"messages": [mock_msg], "state": {}})
    agent._agent = mock_agent

    result, events = await _collect_stream(
        agent.chat_stream("5 day solo Tokyo culture trip", "conv-3")
    )

    mock_agent.ainvoke.assert_called_once()
    agent._auto_propose_route.assert_called_once()
    agent._auto_build_itinerary.assert_called_once()
    assert result.get("response") == "Your trip is ready!"


@pytest.mark.asyncio
async def test_post_onboarding_invokes_agent(agent):
    """When all slots are filled (onboarding complete), the agent SHOULD be invoked."""
    full_state = create_default_trip_state()
    for slot in SLOT_ORDER:
        full_state = apply_slot_answer(full_state, slot, "test")
    full_state["itinerary"] = {"days": []}

    mock_msg = MagicMock()
    mock_msg.type = "ai"
    mock_msg.content = "Here's your itinerary update."
    mock_agent_invoke = AsyncMock(return_value={"messages": [mock_msg], "state": {}})
    agent._agent = MagicMock()
    agent._agent.ainvoke = mock_agent_invoke

    result, events = await _collect_stream(
        agent.chat_stream("Add a museum visit on day 2", "conv-4", context={"tripState": full_state})
    )

    mock_agent_invoke.assert_called_once()
    assert result.get("response") == "Here's your itinerary update."


@pytest.mark.asyncio
async def test_onboarding_does_not_loop(agent):
    """Verify that a single onboarding chat call makes at most 1 fallback parser call
    and 0 agent invocations — no infinite loop."""
    agent._pre_parse_initial_message = AsyncMock(return_value=None)

    mock_agent_invoke = AsyncMock()
    agent._agent = MagicMock()
    agent._agent.ainvoke = mock_agent_invoke

    parser_call_count = 0

    async def mock_parse(slot, question, message):
        nonlocal parser_call_count
        parser_call_count += 1
        return "Tokyo"

    with patch("app.agents.travel_agent.slot_parser") as mock_parser:
        mock_parser.parse = mock_parse
        result, events = await _collect_stream(
            agent.chat_stream("Tokyo", "conv-5")
        )

    assert parser_call_count == 1
    mock_agent_invoke.assert_not_called()


@pytest.mark.asyncio
async def test_onboarding_partial_state_uses_fallback(agent):
    """When trip_state has some slots filled but not all, fallback parser handles the next missing slot."""
    partial_state = create_default_trip_state()
    partial_state = apply_slot_answer(partial_state, "destination", "Tokyo")
    partial_state = apply_slot_answer(partial_state, "dates", "flexible")
    partial_state = apply_slot_answer(partial_state, "duration", 7)

    agent._pre_parse_initial_message = AsyncMock(return_value=partial_state)
    mock_agent_invoke = AsyncMock()
    agent._agent = MagicMock()
    agent._agent.ainvoke = mock_agent_invoke

    with patch("app.agents.travel_agent.slot_parser") as mock_parser:
        mock_parser.parse = AsyncMock(return_value="solo")
        result, events = await _collect_stream(
            agent.chat_stream("Solo trip", "conv-6", context={"tripState": partial_state})
        )

    mock_agent_invoke.assert_not_called()
    ts = result.get("tripState", {})
    assert "travelers" in ts.get("onboarding", {}).get("slotsFilled", [])
    assert "trip_style" not in ts.get("onboarding", {}).get("slotsFilled", [])
