"""Integration tests for places routes."""

import pytest


@pytest.mark.asyncio
async def test_places_search_empty_query(client):
    resp = await client.get("/api/places/search", params={"query": ""})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_autocomplete_short_query(client):
    resp = await client.get("/api/places/autocomplete", params={"query": "a"})
    # Should return empty results (too short) or 400
    assert resp.status_code in (200, 400)
