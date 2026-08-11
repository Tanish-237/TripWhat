"""Integration tests for trips routes."""

import pytest


async def _get_auth_token(client) -> str:
    resp = await client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "password123",
    })
    return resp.json()["token"]


@pytest.mark.asyncio
async def test_create_trip(client):
    token = await _get_auth_token(client)
    resp = await client.post("/api/saved-trips/", json={
        "title": "Japan Trip",
        "cities": [{"name": "Tokyo", "days": 5}],
        "totalDays": 5,
        "people": 1,
        "travelType": "cultural",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["savedTrip"]["title"] == "Japan Trip"


@pytest.mark.asyncio
async def test_list_trips(client):
    token = await _get_auth_token(client)
    # Create a trip first
    await client.post("/api/saved-trips/", json={
        "title": "Japan Trip",
        "totalDays": 5,
    }, headers={"Authorization": f"Bearer {token}"})
    # List
    resp = await client.get("/api/saved-trips/", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["savedTrips"]) >= 1


@pytest.mark.asyncio
async def test_get_trip(client):
    token = await _get_auth_token(client)
    create = await client.post("/api/saved-trips/", json={
        "title": "Japan Trip",
        "totalDays": 5,
    }, headers={"Authorization": f"Bearer {token}"})
    trip_id = create.json()["savedTrip"]["id"]
    resp = await client.get(f"/api/saved-trips/{trip_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Japan Trip"


@pytest.mark.asyncio
async def test_delete_trip(client):
    token = await _get_auth_token(client)
    create = await client.post("/api/saved-trips/", json={
        "title": "Japan Trip",
        "totalDays": 5,
    }, headers={"Authorization": f"Bearer {token}"})
    trip_id = create.json()["savedTrip"]["id"]
    resp = await client.delete(f"/api/saved-trips/{trip_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_statistics(client):
    token = await _get_auth_token(client)
    resp = await client.get("/api/saved-trips/statistics", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "statistics" in resp.json()
