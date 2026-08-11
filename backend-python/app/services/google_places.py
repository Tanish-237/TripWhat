"""Google Places API service."""

import httpx

from app.config import settings


class GooglePlacesService:
    BASE_URL = "https://maps.googleapis.com/maps/api/place"

    async def search_places(self, query: str, location: str | None = None) -> list[dict]:
        if not settings.google_places_api_key:
            return []

        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {
                "input": query,
                "inputtype": "textquery",
                "fields": "place_id,name,formatted_address,geometry,rating,photos,types",
                "key": settings.google_places_api_key,
            }
            if location:
                params["locationbias"] = f"point:{location}"

            resp = await client.get(f"{self.BASE_URL}/findplacefromtext/json", params=params)
            data = resp.json()
            candidates = data.get("candidates", [])

            results = []
            for c in candidates:
                geom = c.get("geometry", {}).get("location", {})
                results.append({
                    "placeId": c.get("place_id"),
                    "name": c.get("name"),
                    "address": c.get("formatted_address"),
                    "coordinates": {"lat": geom.get("lat", 0), "lng": geom.get("lng", 0)},
                    "rating": c.get("rating"),
                    "types": c.get("types", []),
                })
            return results

    async def get_place_details(self, place_id: str) -> dict | None:
        if not settings.google_places_api_key:
            return None

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.BASE_URL}/details/json", params={
                "place_id": place_id,
                "fields": "name,formatted_address,geometry,rating,photos,opening_hours,website,formatted_phone_number,reviews,price_level",
                "key": settings.google_places_api_key,
            })
            data = resp.json()
            return data.get("result")

    async def find_nearby(self, lat: float, lng: float, radius: int = 5000, place_type: str = "tourist_attraction") -> list[dict]:
        if not settings.google_places_api_key:
            return []

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.BASE_URL}/nearbysearch/json", params={
                "location": f"{lat},{lng}",
                "radius": radius,
                "type": place_type,
                "key": settings.google_places_api_key,
            })
            data = resp.json()
            results = []
            for r in data.get("results", []):
                geom = r.get("geometry", {}).get("location", {})
                results.append({
                    "placeId": r.get("place_id"),
                    "name": r.get("name"),
                    "address": r.get("vicinity"),
                    "coordinates": {"lat": geom.get("lat", 0), "lng": geom.get("lng", 0)},
                    "rating": r.get("rating"),
                    "types": r.get("types", []),
                })
            return results


google_places = GooglePlacesService()
