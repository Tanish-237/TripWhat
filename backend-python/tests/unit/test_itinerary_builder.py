"""Tests for the itinerary builder."""

import pytest
from app.services.itinerary_builder import itinerary_builder


@pytest.mark.asyncio
async def test_build_single_city():
    result = await itinerary_builder.build({
        "destination": "Tokyo",
        "duration": 5,
    })
    assert result is not None
    itinerary = result["itinerary"]
    assert len(itinerary["days"]) == 5
    assert itinerary["tripMetadata"]["destination"] == "Tokyo"


@pytest.mark.asyncio
async def test_build_multi_city():
    result = await itinerary_builder.build({
        "destination": "Tokyo",
        "duration": 7,
        "cities": [
            {"name": "Tokyo", "days": 4},
            {"name": "Kyoto", "days": 3},
        ],
        "totalDays": 7,
    })
    assert result is not None
    itinerary = result["itinerary"]
    assert len(itinerary["days"]) == 7
    # First 4 days should be Tokyo
    assert itinerary["days"][0]["location"] == "Tokyo"
    assert itinerary["days"][4]["location"] == "Kyoto"


@pytest.mark.asyncio
async def test_build_with_start_date():
    result = await itinerary_builder.build({
        "destination": "Paris",
        "duration": 3,
        "startDate": "2024-10-01",
    })
    itinerary = result["itinerary"]
    assert itinerary["days"][0]["date"] == "2024-10-01"
    assert itinerary["days"][1]["date"] == "2024-10-02"


def test_compute_day_signature():
    from app.schemas.itinerary import DayPlan
    day = DayPlan(dayNumber=1, date="2024-10-01", location="Tokyo")
    sig = itinerary_builder.compute_day_signature(day)
    assert "Tokyo" in sig
    assert "2024-10-01" in sig
