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


@pytest.mark.asyncio
async def test_curate_activities_llm_includes_used_names_in_prompt():
    """Verify that used_names appears in the LLM prompt when provided."""
    places = [
        {"name": "Senso-ji Temple", "rating": 4.5, "types": ["temple"], "description": "Historic temple"},
        {"name": "Shibuya Crossing", "rating": 4.3, "types": ["landmark"], "description": "Busy crossing"},
        {"name": "Tokyo Tower", "rating": 4.2, "types": ["landmark"], "description": "Iconic tower"},
        {"name": "Meiji Shrine", "rating": 4.6, "types": ["shrine"], "description": "Peaceful shrine"},
    ]

    captured_prompt = []

    class MockModel:
        async def ainvoke(self, messages):
            captured_prompt.append(messages[1]["content"])
            class MockResponse:
                content = '[{"period":"morning","name":"Senso-ji Temple","type":"temple","description":"test","duration":"2h"},{"period":"afternoon","name":"Shibuya Crossing","type":"landmark","description":"test","duration":"1h"},{"period":"evening","name":"Tokyo Tower","type":"landmark","description":"test","duration":"1h"}]'
            return MockResponse()

    original_model = itinerary_builder._model
    itinerary_builder._model = MockModel()
    try:
        await itinerary_builder._curate_activities_llm(
            places, "Tokyo", 2, 5, "culture", ["Tokyo"],
            used_names=["Meiji Shrine", "Ueno Park"],
        )
    finally:
        itinerary_builder._model = original_model

    assert len(captured_prompt) == 1
    assert "Meiji Shrine" in captured_prompt[0]
    assert "Ueno Park" in captured_prompt[0]
    assert "DO NOT pick these again" in captured_prompt[0]


@pytest.mark.asyncio
async def test_curate_activities_llm_no_used_names_no_clause():
    """Verify that no used_clause appears when used_names is None or empty."""
    places = [
        {"name": "Senso-ji Temple", "rating": 4.5, "types": ["temple"], "description": "Historic temple"},
        {"name": "Shibuya Crossing", "rating": 4.3, "types": ["landmark"], "description": "Busy crossing"},
        {"name": "Tokyo Tower", "rating": 4.2, "types": ["landmark"], "description": "Iconic tower"},
    ]

    captured_prompt = []

    class MockModel:
        async def ainvoke(self, messages):
            captured_prompt.append(messages[1]["content"])
            class MockResponse:
                content = '[{"period":"morning","name":"Senso-ji Temple","type":"temple","description":"test","duration":"2h"},{"period":"afternoon","name":"Shibuya Crossing","type":"landmark","description":"test","duration":"1h"},{"period":"evening","name":"Tokyo Tower","type":"landmark","description":"test","duration":"1h"}]'
            return MockResponse()

    original_model = itinerary_builder._model
    itinerary_builder._model = MockModel()
    try:
        await itinerary_builder._curate_activities_llm(
            places, "Tokyo", 1, 3, "culture", ["Tokyo"],
            used_names=None,
        )
    finally:
        itinerary_builder._model = original_model

    assert "DO NOT pick these again" not in captured_prompt[0]


@pytest.mark.asyncio
async def test_build_single_city_accumulates_used_names():
    """Verify that used_names accumulates across days in single-city build."""
    call_args = []

    original = itinerary_builder._search_and_curate_activities

    async def mock_search(city, day_num, total_days, trip_style, help_with, all_city_names, used_names=None, **kwargs):
        call_args.append({
            "day": day_num,
            "used_names": list(used_names) if used_names else [],
        })
        return [
            {"period": "morning", "name": f"Place D{day_num}A", "type": "attraction", "description": "test", "duration": "2h"},
            {"period": "afternoon", "name": f"Place D{day_num}B", "type": "attraction", "description": "test", "duration": "2h"},
            {"period": "evening", "name": f"Place D{day_num}C", "type": "attraction", "description": "test", "duration": "1h"},
        ]

    itinerary_builder._search_and_curate_activities = mock_search
    try:
        await itinerary_builder.build({"destination": "Tokyo", "duration": 3})
    finally:
        itinerary_builder._search_and_curate_activities = original

    assert len(call_args) == 3
    # Day 1: no used names
    assert call_args[0]["used_names"] == []
    # Day 2: should have day 1's places
    assert "Place D1A" in call_args[1]["used_names"]
    assert "Place D1B" in call_args[1]["used_names"]
    assert "Place D1C" in call_args[1]["used_names"]
    # Day 3: should have day 1 and day 2's places
    assert "Place D1A" in call_args[2]["used_names"]
    assert "Place D2A" in call_args[2]["used_names"]
    assert len(call_args[2]["used_names"]) == 6


@pytest.mark.asyncio
async def test_build_multi_city_resets_used_names_per_city():
    """Verify that used_names resets when switching cities in multi-city build."""
    call_args = []

    original = itinerary_builder._search_and_curate_activities

    async def mock_search(city, day_num, total_days, trip_style, help_with, all_city_names, used_names=None, **kwargs):
        call_args.append({
            "city": city,
            "day": day_num,
            "used_names": list(used_names) if used_names else [],
        })
        return [
            {"period": "morning", "name": f"{city} D{day_num}A", "type": "attraction", "description": "test", "duration": "2h"},
            {"period": "afternoon", "name": f"{city} D{day_num}B", "type": "attraction", "description": "test", "duration": "2h"},
            {"period": "evening", "name": f"{city} D{day_num}C", "type": "attraction", "description": "test", "duration": "1h"},
        ]

    itinerary_builder._search_and_curate_activities = mock_search
    try:
        await itinerary_builder.build({
            "destination": "Tokyo",
            "duration": 4,
            "cities": [
                {"name": "Tokyo", "days": 2},
                {"name": "Kyoto", "days": 2},
            ],
            "totalDays": 4,
        })
    finally:
        itinerary_builder._search_and_curate_activities = original

    assert len(call_args) == 4
    # Days are numbered continuously across cities (day_idx + 1)
    # Tokyo day 1 (global day 1): empty
    assert call_args[0]["city"] == "Tokyo"
    assert call_args[0]["used_names"] == []
    # Tokyo day 2 (global day 2): has Tokyo day 1 places
    assert call_args[1]["city"] == "Tokyo"
    assert "Tokyo D1A" in call_args[1]["used_names"]
    # Kyoto day 1 (global day 3): reset — should NOT have Tokyo places
    assert call_args[2]["city"] == "Kyoto"
    assert call_args[2]["used_names"] == []
    assert "Tokyo D1A" not in call_args[2]["used_names"]
    # Kyoto day 2 (global day 4): has Kyoto day 3 places, but NOT Tokyo places
    assert call_args[3]["city"] == "Kyoto"
    assert "Kyoto D3A" in call_args[3]["used_names"]
    assert "Tokyo D1A" not in call_args[3]["used_names"]
