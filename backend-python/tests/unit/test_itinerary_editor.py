"""Tests for the itinerary editor."""

import pytest
from app.services.itinerary_editor import itinerary_editor
from app.schemas.itinerary import create_itinerary


@pytest.mark.asyncio
async def test_add_activity():
    itinerary = create_itinerary("Tokyo", 3).model_dump()
    action = {
        "type": "add",
        "target": {"day": 1, "timeSlot": "morning"},
        "details": {"placeName": "Senso-ji Temple"},
    }
    result = await itinerary_editor.add_activity(itinerary, action, "Tokyo")
    # The place search may return the actual name (e.g. "Sensō-ji" instead of "Senso-ji Temple")
    assert "Added" in result["message"]
    assert "Day 1" in result["message"]
    day = result["itinerary"]["days"][0]
    morning = next(s for s in day["timeSlots"] if s["period"] == "morning")
    assert len(morning.get("activities", [])) > 0


def test_remove_activity():
    itinerary = create_itinerary("Tokyo", 3).model_dump()
    # First add an activity to both slot.activity and slot.activities
    day = itinerary["days"][0]
    morning = next(s for s in day["timeSlots"] if s["period"] == "morning")
    act = {"id": "test-1", "title": "Senso-ji Temple"}
    morning["activities"] = [act]
    morning["activity"] = act

    action = {
        "type": "remove",
        "target": {"day": 1, "activityId": "test-1"},
    }
    result = itinerary_editor.remove_activity(itinerary, action)
    assert "Removed" in result["message"]
    # The slot should be removed entirely (since it only held this one activity)
    remaining_morning = [s for s in day["timeSlots"] if s.get("period") == "morning"]
    assert len(remaining_morning) == 0


def test_add_day():
    itinerary = create_itinerary("Tokyo", 3).model_dump()
    result = itinerary_editor.add_day(itinerary)
    assert len(result["itinerary"]["days"]) == 4
    assert result["itinerary"]["days"][3]["dayNumber"] == 4


def test_remove_day():
    itinerary = create_itinerary("Tokyo", 3).model_dump()
    result = itinerary_editor.remove_day(itinerary, 2)
    assert len(result["itinerary"]["days"]) == 2
    # Day numbers should be renumbered
    assert result["itinerary"]["days"][1]["dayNumber"] == 2
