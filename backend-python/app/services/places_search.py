"""Places search service — cache-first with fallback chain.

Flow:
  1. Check search_cache for the query → if hit, fetch from places_cache
  2. If miss, try MCP search_places (Google Maps Grounding Lite)
  3. If MCP unavailable, try Google Places API directly
  4. If no API key, try OpenTripMap
  5. If all fail, return empty (LLM fallback handled by caller)
  6. Cache results in places_cache + search_cache
"""

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.places_cache import PlacesCache, SearchCache
from app.services.mcp_client import maps_mcp
from app.services.google_places import google_places
from app.services.places_service import places_service
from app.utils.logger import logger

CACHE_TTL_DAYS = 30


class PlacesSearchService:
    """Cache-first places search with MCP → Google Places → OpenTripMap fallback."""

    async def search(
        self,
        query: str,
        city: str,
        limit: int = 10,
        skip_cache: bool = False,
    ) -> list[dict]:
        """Search for places with cache-first strategy.

        Args:
            query: Search query (e.g., "top attractions in Tokyo")
            city: City name for caching
            limit: Max results
            skip_cache: If True, bypass cache and fetch fresh

        Returns:
            List of normalized place dicts
        """
        if not skip_cache:
            cached = await self._get_cached(query)
            if cached:
                logger.info(f"[PLACES_SEARCH] Cache hit for '{query}' → {len(cached)} places")
                return cached[:limit]

        # Fallback chain: MCP → Google Places API → OpenTripMap
        places = await self._search_mcp(query, city, limit)
        if not places:
            places = await self._search_google_places(query, city, limit)
        if not places:
            places = await self._search_opentripmap(query, city, limit)

        if places:
            await self._cache_results(query, city, places)

        return places[:limit]

    async def search_by_name(self, name: str, city: str) -> dict | None:
        """Search for a specific place by name (for edit commands).

        First checks places_cache by name, then falls back to search.
        """
        # Check cache first
        cached = await self._get_cached_by_name(name, city)
        if cached:
            logger.info(f"[PLACES_SEARCH] Name cache hit for '{name}' in {city}")
            return cached

        # Search via MCP
        query = f"{name} in {city}"
        places = await self._search_mcp(query, city, limit=1)
        if not places:
            places = await self._search_google_places(query, city, limit=1)

        if places:
            await self._cache_results(query, city, places)
            return places[0]

        return None

    async def search_multiple(
        self,
        queries: list[str],
        city: str,
        limit_per_query: int = 5,
    ) -> list[dict]:
        """Run multiple queries and merge results."""
        import asyncio

        tasks = [self.search(q, city, limit_per_query) for q in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        merged: list[dict] = []
        seen_ids: set[str] = set()
        for r in results:
            if isinstance(r, list):
                for p in r:
                    pid = p.get("placeId") or p.get("id") or p.get("name", "")
                    if pid and pid not in seen_ids:
                        seen_ids.add(pid)
                        merged.append(p)

        return merged

    async def _get_cached(self, query: str) -> list[dict] | None:
        """Get cached search results."""
        async with async_session() as db:
            # Check search_cache
            result = await db.execute(
                select(SearchCache).where(
                    SearchCache.query == query,
                    SearchCache.expires_at > datetime.utcnow(),
                )
            )
            search_entry = result.scalar_one_or_none()
            if not search_entry:
                return None

            # Fetch places from places_cache
            place_ids = search_entry.place_ids or []
            if not place_ids:
                return None

            result = await db.execute(
                select(PlacesCache).where(PlacesCache.place_id.in_(place_ids))
            )
            places = result.scalars().all()
            if not places:
                return None

            # Update access stats
            await db.execute(
                update(PlacesCache)
                .where(PlacesCache.place_id.in_(place_ids))
                .values(access_count=PlacesCache.access_count + 1, last_accessed=datetime.utcnow())
            )
            await db.commit()

            return [self._orm_to_dict(p) for p in places]

    async def _get_cached_by_name(self, name: str, city: str) -> dict | None:
        """Get a cached place by name (fuzzy match)."""
        async with async_session() as db:
            result = await db.execute(
                select(PlacesCache).where(
                    PlacesCache.city.ilike(f"%{city}%"),
                    PlacesCache.name.ilike(f"%{name}%"),
                ).limit(1)
            )
            place = result.scalar_one_or_none()
            if not place:
                return None

            await db.execute(
                update(PlacesCache)
                .where(PlacesCache.id == place.id)
                .values(access_count=PlacesCache.access_count + 1, last_accessed=datetime.utcnow())
            )
            await db.commit()

            return self._orm_to_dict(place)

    async def _cache_results(self, query: str, city: str, places: list[dict]) -> None:
        """Cache search results in places_cache + search_cache."""
        if not places:
            return

        place_ids = []
        async with async_session() as db:
            for p in places:
                pid = p.get("placeId") or p.get("id") or ""
                if not pid:
                    pid = f"place_{hash(p.get('name', ''))}"

                place_ids.append(pid)

                # Upsert into places_cache
                existing = await db.execute(
                    select(PlacesCache).where(PlacesCache.place_id == pid)
                )
                existing_place = existing.scalar_one_or_none()

                coords = p.get("coordinates", {})
                if existing_place:
                    existing_place.access_count += 1
                    existing_place.last_accessed = datetime.utcnow()
                else:
                    db.add(PlacesCache(
                        place_id=pid,
                        name=p.get("name", ""),
                        address=p.get("address", ""),
                        city=city,
                        lat=coords.get("lat") or coords.get("latitude"),
                        lng=coords.get("lng") or coords.get("longitude"),
                        rating=p.get("rating"),
                        types=p.get("types", []),
                        description=p.get("description", ""),
                        photo_url=p.get("photo_url", ""),
                        website=p.get("website", ""),
                        phone=p.get("phone", ""),
                        search_query=query,
                        last_accessed=datetime.utcnow(),
                    ))

            # Upsert search_cache
            existing_search = await db.execute(
                select(SearchCache).where(SearchCache.query == query)
            )
            search_entry = existing_search.scalar_one_or_none()
            if search_entry:
                search_entry.place_ids = place_ids
                search_entry.expires_at = datetime.utcnow() + timedelta(days=CACHE_TTL_DAYS)
                search_entry.result_count = len(places)
            else:
                db.add(SearchCache(
                    query=query,
                    city=city,
                    result_count=len(places),
                    place_ids=place_ids,
                    expires_at=datetime.utcnow() + timedelta(days=CACHE_TTL_DAYS),
                ))

            await db.commit()

        logger.info(f"[PLACES_SEARCH] Cached {len(places)} places for '{query}'")

    async def _search_mcp(self, query: str, city: str, limit: int) -> list[dict]:
        """Search via Google Maps MCP (Grounding Lite)."""
        try:
            results = await maps_mcp.search_places(query, language_code="en")
            if results:
                for r in results:
                    if not r.get("city"):
                        r["city"] = city
                return results
        except Exception as e:
            logger.warning(f"[PLACES_SEARCH] MCP search failed: {e}")
        return []

    async def _search_google_places(self, query: str, city: str, limit: int) -> list[dict]:
        """Search via Google Places API directly."""
        try:
            results = await google_places.search_places(query)
            if results:
                for r in results:
                    r["city"] = city
                return results
        except Exception as e:
            logger.warning(f"[PLACES_SEARCH] Google Places API failed: {e}")
        return []

    async def _search_opentripmap(self, query: str, city: str, limit: int) -> list[dict]:
        """Search via OpenTripMap API."""
        try:
            results = await places_service.search_places(query, limit=limit)
            if results:
                for r in results:
                    coords = r.get("coordinates", {})
                    r["placeId"] = r.get("id", "")
                    r["coordinates"] = {"lat": coords.get("lat", 0), "lng": coords.get("lon", 0)}
                    r["city"] = city
                return results
        except Exception as e:
            logger.warning(f"[PLACES_SEARCH] OpenTripMap failed: {e}")
        return []

    def _orm_to_dict(self, place: PlacesCache) -> dict:
        """Convert PlacesCache ORM to dict."""
        return {
            "placeId": place.place_id,
            "name": place.name,
            "address": place.address or "",
            "city": place.city,
            "coordinates": {"lat": place.lat or 0, "lng": place.lng or 0},
            "rating": place.rating,
            "types": place.types or [],
            "description": place.description or "",
            "photo_url": place.photo_url or "",
            "website": place.website or "",
            "phone": place.phone or "",
        }


places_search = PlacesSearchService()
