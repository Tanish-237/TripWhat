"""Tests for the regex fallback slot parser."""

import pytest
from app.services.slot_parser import _fallback


def test_destination_single_city():
    result = _fallback("destination", "Tokyo")
    assert result == "Tokyo"


def test_destination_multiple_cities():
    result = _fallback("destination", "Tokyo, Kyoto, Osaka")
    assert result == ["Tokyo", "Kyoto", "Osaka"]


def test_destination_rejects_conversational():
    assert _fallback("destination", "yes") is None
    assert _fallback("destination", "sure") is None
    assert _fallback("destination", "let's plan") is None
    assert _fallback("destination", "solo") is None
    assert _fallback("destination", "flexible") is None


def test_dates_flexible():
    assert _fallback("dates", "flexible") == "flexible"
    assert _fallback("dates", "I'm flexible") == "flexible"


def test_dates_unsure():
    assert _fallback("dates", "not sure") == "unsure"


def test_dates_specific():
    result = _fallback("dates", "2024-10-15")
    assert result == {"start": "2024-10-15", "end": None}


def test_dates_month():
    result = _fallback("dates", "October")
    assert result == {"flexible": True, "roughMonth": "october"}


def test_duration_days():
    assert _fallback("duration", "14 days") == 14
    assert _fallback("duration", "5 days") == 5


def test_duration_weeks():
    assert _fallback("duration", "2 weeks") == 14


def test_duration_bare_number():
    assert _fallback("duration", "7") == 7


def test_travelers_solo():
    assert _fallback("travelers", "solo") == "solo"
    assert _fallback("travelers", "alone") == "solo"
    assert _fallback("travelers", "just me") == "solo"


def test_travelers_couple():
    assert _fallback("travelers", "couple") == "couple"
    assert _fallback("travelers", "with my wife") == "couple"


def test_travelers_family():
    assert _fallback("travelers", "family") == "family"
    assert _fallback("travelers", "with kids") == "family"


def test_travelers_number():
    assert _fallback("travelers", "2 people") == "couple"
    assert _fallback("travelers", "5 people") == "group"


def test_budget():
    assert _fallback("budget", "budget") == "budget"
    assert _fallback("budget", "cheap") == "budget"
    assert _fallback("budget", "mid-range") == "mid-range"
    assert _fallback("budget", "luxury") == "luxury"
    assert _fallback("budget", "expensive") == "luxury"


def test_pace():
    assert _fallback("pace", "relaxed") == "relaxed"
    assert _fallback("pace", "slow") == "relaxed"
    assert _fallback("pace", "moderate") == "moderate"
    assert _fallback("pace", "packed") == "packed"
    assert _fallback("pace", "fast") == "packed"
