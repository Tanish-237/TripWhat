"""Integration tests for flights routes."""

import pytest


@pytest.mark.asyncio
async def test_flights_search_missing_params(client):
    resp = await client.get("/api/flights/search")
    assert resp.status_code == 422  # FastAPI validation error
