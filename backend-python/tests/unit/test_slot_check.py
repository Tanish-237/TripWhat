"""Tests for slot checking logic."""

import pytest
from app.agents.state import check_slots, apply_slot_answer, create_default_trip_state, SLOT_ORDER


def test_empty_state_all_slots_missing():
    result = check_slots(None)
    assert not result["proceed"]
    assert len(result["missingSlots"]) == len(SLOT_ORDER)
    assert result["missingSlots"] == ["destination", "dates", "duration", "travelers", "trip_style", "help_with"]


def test_default_state_all_slots_missing():
    state = create_default_trip_state()
    result = check_slots(state)
    assert not result["proceed"]
    assert len(result["missingSlots"]) == len(SLOT_ORDER)


def test_fill_destination():
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", "Tokyo")
    result = check_slots(state)
    assert "destination" in result["filledSlots"]
    assert "destination" not in result["missingSlots"]
    assert state["cities"] == [{"name": "Tokyo", "order": 0}]


def test_fill_multiple_destinations():
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", ["Tokyo", "Kyoto", "Osaka"])
    assert len(state["cities"]) == 3
    assert state["cities"][0]["name"] == "Tokyo"
    assert state["cities"][1]["name"] == "Kyoto"


def test_fill_all_slots():
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", "Tokyo")
    state = apply_slot_answer(state, "dates", "flexible")
    state = apply_slot_answer(state, "duration", 7)
    state = apply_slot_answer(state, "travelers", "solo")
    state = apply_slot_answer(state, "trip_style", "culture")
    state = apply_slot_answer(state, "help_with", "everything")
    result = check_slots(state)
    assert result["proceed"]
    assert state["onboarding"]["completed"]


def test_fill_travelers_solo():
    state = create_default_trip_state()
    state = apply_slot_answer(state, "travelers", "solo")
    assert state["travelers"] == {"adults": 1}


def test_fill_travelers_family():
    state = create_default_trip_state()
    state = apply_slot_answer(state, "travelers", "family")
    assert state["travelers"] == {"adults": 2, "children": 2}


def test_fill_duration_distributes_nights():
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", ["Tokyo", "Kyoto"])
    state = apply_slot_answer(state, "duration", 7)
    # 7 days = 6 nights, split between 2 cities = 3 each
    assert state["cities"][0]["nights"] >= 3
    assert state["cities"][1]["nights"] >= 3


def test_version_increments():
    state = create_default_trip_state()
    assert state["version"] == 0
    state = apply_slot_answer(state, "destination", "Tokyo")
    assert state["version"] == 1
    state = apply_slot_answer(state, "dates", "flexible")
    assert state["version"] == 2
