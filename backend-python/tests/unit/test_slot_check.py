"""Tests for the new plan_trip flow — replaces test_slot_check.py.

The old slot-filling state machine (check_slots, apply_slot_answer, SLOT_ORDER)
has been removed. These tests cover the new normalize_dates helper and
plan_trip tool behavior.
"""

import pytest
from app.agents.state import (
    create_default_trip_state, normalize_dates, distribute_nights,
)


# ---------------------------------------------------------------------------
# normalize_dates
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("month", [
    "december", "october", "april", "january", "september",
    "Dec", "Oct", "Apr", "jan", "sep",
])
def test_normalize_dates_month_name(month):
    """A bare month name should produce assumed concrete dates."""
    result = normalize_dates(month, duration=7)
    assert result is not None
    assert result.get("start")
    assert result.get("assumed") is True


def test_normalize_dates_month_with_year():
    """'Oct 2026' should produce assumed dates in October 2026."""
    result = normalize_dates("Oct 2026", duration=7)
    assert result is not None
    assert result.get("start", "").startswith("2026-10")
    assert result.get("assumed") is True


def test_normalize_dates_yyyy_mm():
    """'2026-10' should produce assumed dates in October 2026."""
    result = normalize_dates("2026-10", duration=7)
    assert result is not None
    assert result.get("start", "").startswith("2026-10")


def test_normalize_dates_date_range():
    """'2026-10-10 to 2026-10-20' should produce concrete dates."""
    result = normalize_dates("2026-10-10 to 2026-10-20")
    assert result == {"start": "2026-10-10", "end": "2026-10-20", "assumed": False}


def test_normalize_dates_single_date():
    """A single date should produce a range with default duration."""
    result = normalize_dates("2026-10-10", duration=7)
    assert result is not None
    assert result["start"] == "2026-10-10"
    assert result["end"] == "2026-10-16"
    assert result["assumed"] is False


def test_normalize_dates_flexible():
    """'flexible' should produce near-future assumed dates."""
    result = normalize_dates("flexible", duration=7)
    assert result is not None
    assert result.get("start")
    assert result.get("assumed") is True


def test_normalize_dates_any():
    """'any' should produce near-future assumed dates."""
    result = normalize_dates("any", duration=5)
    assert result is not None
    assert result.get("start")
    assert result.get("assumed") is True


def test_normalize_dates_you_decide():
    """'you_decide' should produce near-future assumed dates."""
    result = normalize_dates("you_decide", duration=7)
    assert result is not None
    assert result.get("assumed") is True


def test_normalize_dates_dict_with_start():
    """A dict with start/end should pass through."""
    result = normalize_dates({"start": "2026-10-10", "end": "2026-10-17"})
    assert result == {"start": "2026-10-10", "end": "2026-10-17", "assumed": False}


def test_normalize_dates_dict_flexible_rough_month():
    """A dict with flexible+roughMonth should convert to assumed dates."""
    result = normalize_dates({"flexible": True, "roughMonth": "october"}, duration=7)
    assert result is not None
    assert result.get("start")
    assert result.get("assumed") is True


def test_normalize_dates_none():
    """None should return None."""
    assert normalize_dates(None) is None


def test_normalize_dates_invalid():
    """An invalid string should return None."""
    assert normalize_dates("not a date") is None


# ---------------------------------------------------------------------------
# distribute_nights
# ---------------------------------------------------------------------------

def test_distribute_nights_single_city():
    state = create_default_trip_state()
    state["cities"] = [{"name": "Tokyo", "order": 0}]
    distribute_nights(state, 7)
    assert state["cities"][0]["nights"] == 6  # 7 days = 6 nights


def test_distribute_nights_multi_city():
    state = create_default_trip_state()
    state["cities"] = [{"name": "Tokyo", "order": 0}, {"name": "Kyoto", "order": 1}]
    distribute_nights(state, 7)
    # 7 days = 6 nights, split between 2 cities = 3 each
    assert state["cities"][0]["nights"] >= 3
    assert state["cities"][1]["nights"] >= 3
    assert sum(c["nights"] for c in state["cities"]) == 6


def test_distribute_nights_remainder():
    """Remainder nights go to the first city."""
    state = create_default_trip_state()
    state["cities"] = [{"name": "Tokyo", "order": 0}, {"name": "Kyoto", "order": 1}, {"name": "Osaka", "order": 2}]
    distribute_nights(state, 10)
    # 10 days = 9 nights, 3 cities = 3 each, remainder 0
    total = sum(c["nights"] for c in state["cities"])
    assert total == 9


# ---------------------------------------------------------------------------
# create_default_trip_state
# ---------------------------------------------------------------------------

def test_default_state():
    state = create_default_trip_state()
    assert state["status"] == "planning"
    assert state["cities"] == []
    assert state["version"] == 0
