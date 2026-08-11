"""Travel means service — route cost/time calculation."""

import uuid
from datetime import datetime, timedelta

from app.services.serpapi_provider import serpapi_provider
from app.utils.logger import logger


class TravelMeansService:
    async def calculate_travel_means(
        self,
        start_location: str,
        cities: list[str],
        start_date: datetime,
        total_days: int,
        passengers: int,
        preferences: dict | None = None,
    ) -> dict:
        all_cities = [start_location] + cities + [start_location]
        routes = []

        for i in range(len(all_cities) - 1):
            from_loc = all_cities[i]
            to_loc = all_cities[i + 1]
            route_date = self._segment_date(start_date, total_days, i, len(all_cities) - 1)
            route = await self.get_travel_means_for_route(
                from_loc, to_loc, route_date, passengers, preferences
            )
            routes.append(route)

        total_min = sum(r["estimatedCost"]["min"] for r in routes)
        total_max = sum(r["estimatedCost"]["max"] for r in routes)
        total_time = self._format_duration(sum(self._parse_duration(r["estimatedTravelTime"]) for r in routes))

        return {
            "routes": routes,
            "totalEstimatedCost": {"min": total_min, "max": total_max, "currency": "USD"},
            "totalTravelTime": total_time,
            "recommendations": self._generate_recommendations(routes),
        }

    async def get_travel_means_for_route(
        self,
        from_location: str,
        to: str,
        departure_date: datetime,
        passengers: int,
        preferences: dict | None = None,
    ) -> dict:
        date_str = departure_date.strftime("%Y-%m-%d")
        flights = []
        try:
            flights = await serpapi_provider.search_flights(
                origin=from_location,
                destination=to,
                departure_date=date_str,
                adults=passengers,
                travel_class=(preferences or {}).get("travelClass", "economy"),
            )
        except Exception as e:
            logger.error(f"Flight search failed for {from_location}→{to}: {e}")

        prices = [f["price"] for f in flights if f.get("price")]
        durations = [f["totalDuration"] for f in flights if f.get("totalDuration")]
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        min_duration = min(durations) if durations else 0

        return {
            "id": str(uuid.uuid4()),
            "from": from_location,
            "to": to,
            "travelMode": "FLIGHT",
            "flights": flights,
            "groundTransport": [],
            "estimatedCost": {"min": min_price, "max": max_price, "currency": "USD"},
            "estimatedTravelTime": self._format_duration(min_duration),
        }

    def _segment_date(self, start: datetime, total_days: int, segment_idx: int, total_segments: int) -> datetime:
        days_per = total_days // total_segments if total_segments > 0 else 0
        return start + timedelta(days=days_per * segment_idx)

    def _parse_duration(self, duration: str) -> int:
        import re
        match = re.match(r"(\d+)h\s*(\d+)?m?", duration or "")
        if match:
            return int(match.group(1)) * 60 + int(match.group(2) or 0)
        return 0

    def _format_duration(self, minutes: int) -> str:
        hours = minutes // 60
        mins = minutes % 60
        if hours and mins:
            return f"{hours}h {mins}m"
        if hours:
            return f"{hours}h"
        return f"{mins}m"

    def _generate_recommendations(self, routes: list[dict]) -> list[dict]:
        recs = []
        cost_effective = sorted(
            [(i, r) for i, r in enumerate(routes) if r["flights"]],
            key=lambda x: x[1]["estimatedCost"]["min"],
        )[: max(1, len(routes) // 2)]

        if cost_effective:
            recs.append({
                "type": "COST_EFFECTIVE",
                "routeIndices": [i for i, _ in cost_effective],
                "description": "Most budget-friendly flight options across your journey",
                "estimatedSavings": sum(r["estimatedCost"]["max"] - r["estimatedCost"]["min"] for _, r in cost_effective),
            })

        direct = [i for i, r in enumerate(routes) if any(not f.get("layovers") for f in r["flights"])]
        if direct:
            recs.append({
                "type": "DIRECT_FLIGHTS",
                "routeIndices": direct,
                "description": "Direct flights available - no layovers required",
                "estimatedTimeSaving": "Save 2-4 hours per flight",
            })

        return recs


travel_means_service = TravelMeansService()
