"""Tests for photo resolution and dynamic duration features."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.itinerary_builder import itinerary_builder, TIME_BUDGETS, TYPE_DURATIONS


class TestEstimateDuration:
    def test_museum_duration(self):
        place = {"types": ["museum", "point_of_interest"]}
        assert itinerary_builder._estimate_duration(place) == 2.5

    def test_temple_duration(self):
        place = {"types": ["temple"]}
        assert itinerary_builder._estimate_duration(place) == 1.0

    def test_shrine_duration(self):
        place = {"types": ["shrine"]}
        assert itinerary_builder._estimate_duration(place) == 0.5

    def test_unknown_type_defaults_to_2(self):
        place = {"types": ["unknown_type"]}
        assert itinerary_builder._estimate_duration(place) == 2.0

    def test_empty_types_defaults_to_2(self):
        place = {"types": []}
        assert itinerary_builder._estimate_duration(place) == 2.0

    def test_picks_max_duration_from_multiple_types(self):
        place = {"types": ["museum", "park", "amusement_park"]}
        assert itinerary_builder._estimate_duration(place) == 5.0

    def test_no_types_key(self):
        place = {}
        assert itinerary_builder._estimate_duration(place) == 2.0


class TestPaceToBudget:
    def test_relaxed_budget(self):
        budget = itinerary_builder._pace_to_budget("relaxed")
        assert budget == TIME_BUDGETS["relaxed"]
        assert budget["morning"] == 3

    def test_balanced_maps_to_moderate(self):
        budget = itinerary_builder._pace_to_budget("balanced")
        assert budget == TIME_BUDGETS["moderate"]

    def test_packed_budget(self):
        budget = itinerary_builder._pace_to_budget("packed")
        assert budget == TIME_BUDGETS["packed"]
        assert budget["morning"] == 5

    def test_adventure_maps_to_packed(self):
        budget = itinerary_builder._pace_to_budget("adventure")
        assert budget == TIME_BUDGETS["packed"]

    def test_unknown_defaults_to_moderate(self):
        budget = itinerary_builder._pace_to_budget("unknown_style")
        assert budget == TIME_BUDGETS["moderate"]


class TestAddHours:
    def test_add_2_hours(self):
        assert itinerary_builder._add_hours("09:00", 2.0) == "11:00"

    def test_add_half_hour(self):
        assert itinerary_builder._add_hours("09:00", 0.5) == "09:30"

    def test_add_3_5_hours(self):
        assert itinerary_builder._add_hours("09:00", 3.5) == "12:30"

    def test_wraps_past_midnight(self):
        assert itinerary_builder._add_hours("23:00", 2.0) == "01:00"

    def test_invalid_time_returns_default(self):
        assert itinerary_builder._add_hours("invalid", 2.0) == "18:00"


class TestDefaultEndTime:
    def test_morning_default(self):
        assert itinerary_builder._default_end_time("morning") == "12:00"

    def test_afternoon_default(self):
        assert itinerary_builder._default_end_time("afternoon") == "18:00"

    def test_evening_default(self):
        assert itinerary_builder._default_end_time("evening") == "22:00"

    def test_unknown_period(self):
        assert itinerary_builder._default_end_time("unknown") == "18:00"


class TestActivityToTimeSlotWithDuration:
    def test_duration_hours_calculates_end_time(self):
        act = {
            "name": "Test Museum",
            "period": "morning",
            "duration_hours": 2.5,
            "type": "museum",
        }
        slot = itinerary_builder._activity_to_time_slot(act, "09:00")
        assert slot.startTime == "09:00"
        assert slot.endTime == "11:30"
        assert slot.activity.name == "Test Museum"

    def test_chained_from_prev_end(self):
        act = {
            "name": "Test Park",
            "period": "afternoon",
            "duration_hours": 1.5,
        }
        slot = itinerary_builder._activity_to_time_slot(act, "14:30")
        assert slot.startTime == "14:30"
        assert slot.endTime == "16:00"

    def test_no_duration_uses_default_end(self):
        act = {
            "name": "Test Place",
            "period": "morning",
        }
        slot = itinerary_builder._activity_to_time_slot(act, "09:00")
        assert slot.startTime == "09:00"
        assert slot.endTime == "12:00"

    def test_photo_url_passed_to_activity(self):
        act = {
            "name": "Test Place",
            "period": "morning",
            "photo_url": "https://example.com/photo.jpg",
        }
        slot = itinerary_builder._activity_to_time_slot(act, "09:00")
        assert slot.activity.imageUrl == "https://example.com/photo.jpg"
        assert slot.activity.photos == ["https://example.com/photo.jpg"]

    def test_no_photo_url(self):
        act = {"name": "Test Place", "period": "morning"}
        slot = itinerary_builder._activity_to_time_slot(act, "09:00")
        assert slot.activity.imageUrl is None
        assert slot.activity.photos is None


class TestEnrichActivitiesAsync:
    @pytest.mark.asyncio
    async def test_enrich_resolves_photo_reference(self):
        places = [
            {"name": "Test Museum", "photo_url": "some_photo_ref", "placeId": "123", "coordinates": {"lat": 0, "lng": 0}},
        ]
        curated = [{"name": "Test Museum"}]

        with patch("app.services.google_places.google_places.resolve_photo_url", new_callable=AsyncMock) as mock_resolve:
            mock_resolve.return_value = "https://example.com/resolved.jpg"
            result = await itinerary_builder._enrich_activities(curated, places)

        assert result[0]["photo_url"] == "https://example.com/resolved.jpg"
        mock_resolve.assert_called_once_with("some_photo_ref")

    @pytest.mark.asyncio
    async def test_enrich_keeps_http_url(self):
        places = [
            {"name": "Test Museum", "photo_url": "https://example.com/already_resolved.jpg", "placeId": "123"},
        ]
        curated = [{"name": "Test Museum"}]

        result = await itinerary_builder._enrich_activities(curated, places)
        assert result[0]["photo_url"] == "https://example.com/already_resolved.jpg"

    @pytest.mark.asyncio
    async def test_enrich_sets_none_when_resolution_fails(self):
        places = [
            {"name": "Test Museum", "photo_url": "some_ref", "placeId": "123"},
        ]
        curated = [{"name": "Test Museum"}]

        with patch("app.services.google_places.google_places.resolve_photo_url", new_callable=AsyncMock) as mock_resolve:
            mock_resolve.return_value = None
            result = await itinerary_builder._enrich_activities(curated, places)

        assert result[0]["photo_url"] is None

    @pytest.mark.asyncio
    async def test_enrich_no_matching_place(self):
        places = [{"name": "Different Place", "photo_url": "ref"}]
        curated = [{"name": "Test Museum"}]

        result = await itinerary_builder._enrich_activities(curated, places)
        assert "photo_url" not in result[0] or result[0].get("photo_url") is None


class TestGooglePlacesPhotoResolution:
    @pytest.mark.asyncio
    async def test_resolve_photo_url_returns_redirect_location(self):
        from app.services.google_places import GooglePlacesService

        service = GooglePlacesService()

        mock_response = MagicMock()
        mock_response.status_code = 302
        mock_response.headers = {"location": "https://lh3.googleusercontent.com/photo.jpg"}

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with patch("app.services.google_places.settings") as mock_settings:
                mock_settings.google_places_api_key = "test_key"
                url = await service.resolve_photo_url("test_ref", 400)

        assert url == "https://lh3.googleusercontent.com/photo.jpg"

    @pytest.mark.asyncio
    async def test_resolve_photo_url_no_api_key(self):
        from app.services.google_places import GooglePlacesService

        service = GooglePlacesService()

        with patch("app.services.google_places.settings") as mock_settings:
            mock_settings.google_places_api_key = None
            url = await service.resolve_photo_url("test_ref")

        assert url is None

    @pytest.mark.asyncio
    async def test_resolve_photo_url_non_302_response(self):
        from app.services.google_places import GooglePlacesService

        service = GooglePlacesService()

        mock_response = MagicMock()
        mock_response.status_code = 403

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with patch("app.services.google_places.settings") as mock_settings:
                mock_settings.google_places_api_key = "test_key"
                url = await service.resolve_photo_url("test_ref")

        assert url is None
