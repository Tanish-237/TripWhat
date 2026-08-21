"""Tests for slot checking logic."""

import pytest
from app.agents.state import check_slots, apply_slot_answer, create_default_trip_state, SLOT_ORDER


def test_empty_state_all_slots_missing():
    result = check_slots(None)
    assert not result["proceed"]
    # origin is conditional (deferred until helpWith is known), so only 6 missing.
    assert len(result["missingSlots"]) == 6
    assert result["missingSlots"] == ["destination", "dates", "duration", "travelers", "trip_style", "help_with"]


def test_default_state_all_slots_missing():
    state = create_default_trip_state()
    result = check_slots(state)
    assert not result["proceed"]
    # origin is conditional, deferred until helpWith is filled.
    assert len(result["missingSlots"]) == 6


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
    # "flexible" now sets pending (not filled); provide a rough month to get assumed dates.
    state = apply_slot_answer(state, "dates", {"flexible": True, "roughMonth": "october"})
    state = apply_slot_answer(state, "duration", 7)
    state = apply_slot_answer(state, "travelers", "solo")
    state = apply_slot_answer(state, "trip_style", "culture")
    state = apply_slot_answer(state, "help_with", "everything")
    # origin is now required (help_with includes "everything")
    state = apply_slot_answer(state, "origin", "San Francisco")
    result = check_slots(state)
    assert result["proceed"]
    assert state["onboarding"]["completed"]
    assert state["dates"].get("start")  # assumed dates generated
    assert state["dates"].get("assumed") is True
    assert state["startLocation"] == "San Francisco"


def test_dates_flexible_sets_pending():
    """'flexible' for dates should set pending state, not mark filled."""
    state = create_default_trip_state()
    state = apply_slot_answer(state, "dates", "flexible")
    assert state["dates"].get("pending") == "month"
    assert "dates" not in state["onboarding"]["slotsFilled"]
    result = check_slots(state)
    assert "dates" in result["missingSlots"]


def test_dates_fixed_sets_pending():
    """'fixed' for dates should set pending state, not mark filled."""
    state = create_default_trip_state()
    state = apply_slot_answer(state, "dates", "fixed")
    assert state["dates"].get("pending") == "fixed"
    assert "dates" not in state["onboarding"]["slotsFilled"]


def test_dates_rough_month_generates_assumed():
    """A rough month should convert to assumed concrete dates."""
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", "Tokyo")
    state = apply_slot_answer(state, "duration", 5)
    state = apply_slot_answer(state, "dates", {"flexible": True, "roughMonth": "october"})
    assert state["dates"].get("start")
    assert state["dates"].get("assumed") is True
    assert state["dates"].get("roughMonth") == "october"
    assert "dates" in state["onboarding"]["slotsFilled"]


def test_origin_conditional_skip():
    """origin should be deferred when helpWith doesn't include flights."""
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", "Tokyo")
    state = apply_slot_answer(state, "dates", {"start": "2026-10-10", "end": "2026-10-17"})
    state = apply_slot_answer(state, "duration", 7)
    state = apply_slot_answer(state, "travelers", "solo")
    state = apply_slot_answer(state, "trip_style", "culture")
    state = apply_slot_answer(state, "help_with", "itinerary")  # no flights
    result = check_slots(state)
    assert result["proceed"]  # origin not required
    assert "origin" not in result["missingSlots"]


def test_origin_required_when_flights_in_scope():
    """origin should be required when helpWith includes flights."""
    state = create_default_trip_state()
    state = apply_slot_answer(state, "destination", "Tokyo")
    state = apply_slot_answer(state, "dates", {"start": "2026-10-10", "end": "2026-10-17"})
    state = apply_slot_answer(state, "duration", 7)
    state = apply_slot_answer(state, "travelers", "solo")
    state = apply_slot_answer(state, "trip_style", "culture")
    state = apply_slot_answer(state, "help_with", ["itinerary", "flights"])
    result = check_slots(state)
    assert not result["proceed"]
    assert "origin" in result["missingSlots"]


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
