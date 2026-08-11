"""Tests for travel means service."""

import pytest
from datetime import datetime
from app.services.travel_means import travel_means_service


def test_format_duration():
    assert travel_means_service._format_duration(90) == "1h 30m"
    assert travel_means_service._format_duration(60) == "1h"
    assert travel_means_service._format_duration(45) == "45m"


def test_parse_duration():
    assert travel_means_service._parse_duration("2h 30m") == 150
    assert travel_means_service._parse_duration("1h") == 60
    assert travel_means_service._parse_duration("") == 0


def test_segment_date():
    start = datetime(2024, 10, 1)
    date = travel_means_service._segment_date(start, 14, 2, 4)
    assert date.day == 7  # 14/4 = 3 days per segment, 3*2 = 6 days offset


def test_generate_recommendations_empty():
    recs = travel_means_service._generate_recommendations([])
    assert recs == []


def test_generate_recommendations_with_flights():
    routes = [
        {"flights": [{"layovers": []}], "estimatedCost": {"min": 100, "max": 200, "currency": "USD"}, "estimatedTravelTime": "2h"},
        {"flights": [{"layovers": [{"airportCode": "LAX"}]}], "estimatedCost": {"min": 150, "max": 300, "currency": "USD"}, "estimatedTravelTime": "4h"},
    ]
    recs = travel_means_service._generate_recommendations(routes)
    assert len(recs) >= 1
    assert recs[0]["type"] == "COST_EFFECTIVE"
