"""Unified itinerary builder — replaces both enhancedItineraryBuilder.ts and itineraryBuilder.ts.

Uses a search → curate → enrich pipeline:
  1. Generate procedural queries (no LLM tokens for search)
  2. Search via places_search service (cache-first, MCP → Google Places → OpenTripMap)
  3. LLM curates the best 3 activities per day from real search results
  4. Build itinerary with real place data (coordinates, ratings, descriptions)
"""

import asyncio
import json
import re
from datetime import datetime, timedelta

from langchain_openai import ChatOpenAI

from app.config import settings
from app.schemas.itinerary import (
    Itinerary, DayPlan, TimeSlot, Activity, ActivityLocation, ActivityCost,
    HotelRecommendation, RestaurantRecommendation, FlightOption,
    create_itinerary, create_day_plan, create_time_slot,
)
from app.services.places_search import places_search
from app.services.query_generator import generate_queries, generate_hotel_queries, generate_restaurant_queries
from app.utils.logger import logger


TIME_BUDGETS = {
    "relaxed": {"morning": 3, "afternoon": 3, "evening": 2},
    "moderate": {"morning": 4, "afternoon": 4, "evening": 3},
    "packed": {"morning": 5, "afternoon": 5, "evening": 4},
}

TYPE_DURATIONS = {
    "museum": 2.5, "art_gallery": 1.5, "park": 1.5, "temple": 1.0,
    "shrine": 0.5, "shopping_mall": 2.0, "restaurant": 1.5, "cafe": 0.75,
    "landmark": 0.5, "historical_site": 1.5, "market": 1.0, "garden": 1.0,
    "amusement_park": 5.0, "zoo": 3.0, "aquarium": 2.0, "beach": 3.0,
    "hiking_trail": 4.0, "viewpoint": 0.5, "neighborhood": 2.0,
    "night_club": 2.0, "bar": 1.5, "tourist_attraction": 2.0,
    "point_of_interest": 1.5, "natural_feature": 1.5, "church": 1.0,
    "castle": 2.0, "monument": 0.5, "square": 0.5, "palace": 2.0,
}


class ItineraryBuilder:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        return self._model

    async def build(self, ctx: dict) -> dict | None:
        cities = ctx.get("cities")
        if cities and len(cities) > 0:
            if ctx.get("include_travel_means"):
                return await self._build_with_travel_means(ctx)
            return await self._build_multi_city(ctx)
        return await self._build_single_city(ctx)

    async def _search_and_curate_activities(
        self,
        city: str,
        day_num: int,
        total_days: int,
        trip_style: str,
        help_with: list[str] | None,
        all_city_names: list[str],
        used_names: list[str] | None = None,
    ) -> list[dict]:
        """Search for real places and use LLM to curate activities for the day.

        1. Generate procedural queries (zero LLM tokens)
        2. Search via places_search (cache-first, with photo resolution)
        3. LLM picks 2-5 activities from real results based on time budget
        """
        # Step 1: Generate queries procedurally
        queries = generate_queries(city, trip_style, help_with, day_num, total_days)
        logger.info(f"[ITINERARY_BUILDER] Generated {len(queries)} queries for {city} day {day_num}: {queries}")

        # Step 2: Search for real places (cache-first, with photos)
        places = await places_search.search_multiple(queries, city, limit_per_query=5)

        if not places:
            logger.warning(f"[ITINERARY_BUILDER] No places found for {city}, using LLM fallback")
            return self._llm_fallback_activities(city, day_num, total_days, trip_style)

        # Step 3: LLM curation — pick best activities from real results
        return await self._curate_activities_llm(places, city, day_num, total_days, trip_style, all_city_names, used_names)

    def _estimate_duration(self, place: dict) -> float:
        """Estimate visit duration in hours based on place types."""
        types = place.get("types", [])
        durations = [TYPE_DURATIONS.get(t, 0) for t in types if t in TYPE_DURATIONS]
        return max(durations) if durations else 2.0

    def _pace_to_budget(self, trip_style: str) -> dict:
        """Map trip style to time budget per period."""
        pace_map = {
            "relaxed": "relaxed",
            "balanced": "moderate",
            "moderate": "moderate",
            "packed": "packed",
            "adventure": "packed",
            "fast": "packed",
        }
        pace = pace_map.get(trip_style, "moderate")
        return TIME_BUDGETS.get(pace, TIME_BUDGETS["moderate"])

    async def _curate_activities_llm(
        self,
        places: list[dict],
        city: str,
        day_num: int,
        total_days: int,
        trip_style: str,
        all_cities: list[str],
        used_names: list[str] | None = None,
    ) -> list[dict]:
        """Use LLM to pick 2-5 activities from real search results based on time budget."""
        is_first_day = day_num == 1
        is_last_day = day_num == total_days
        budget = self._pace_to_budget(trip_style)
        total_budget = sum(budget.values())

        # Format places for the LLM with estimated durations and coordinates
        places_text = []
        for i, p in enumerate(places):
            name = p.get("name", "Unknown")
            rating = p.get("rating", "N/A")
            ptype = ", ".join(p.get("types", [])[:3]) if p.get("types") else "attraction"
            desc = p.get("description", "")[:100]
            est_dur = self._estimate_duration(p)
            coords = p.get("coordinates", {})
            lat = coords.get("lat", 0) if coords else 0
            lng = coords.get("lng", 0) if coords else 0
            places_text.append(f"{i+1}. {name} (rating: {rating}, type: {ptype}, est: {est_dur}h, lat: {lat:.4f}, lng: {lng:.4f}) — {desc}")

        places_str = "\n".join(places_text)

        used_clause = ""
        if used_names:
            used_clause = f". Places already used (DO NOT pick these again): {', '.join(used_names)}"

        first_day_note = "\n- This is the first day — keep it lighter for arrival." if is_first_day else ""
        last_day_note = "\n- This is the last day — wrap up before departure." if is_last_day else ""
        other_cities = f"\n- Other cities on this trip: {', '.join(c for c in all_cities if c != city)}" if len(all_cities) > 1 else ""

        prompt = f"""\
You are a travel itinerary planner for Day {day_num} of a trip to {city}.

Trip pace: {trip_style} (time budget: morning={budget['morning']}h, afternoon={budget['afternoon']}h, evening={budget['evening']}h, total={total_budget}h)

Here are {len(places)} real places found via Google Maps search:
{places_str}

Trip context:
- City: {city}
- Day {day_num} of {total_days}
- Trip style: {trip_style}{first_day_note}{last_day_note}{other_cities}

Rules:
1. GROUP places by geographic proximity — pick places that are close together so the traveler minimizes transit time. Use the lat/lng coordinates to cluster nearby places.
2. Order the selected places in a logical walking/route order (nearest to farthest from a starting point, minimizing backtracking).
3. Select 2-5 different places from the list above (use the exact name)
4. Assign each to morning, afternoon, or evening
5. The total estimated duration should fit within the time budget for each period
6. Consider variety (don't pick 3 museums or 3 restaurants)
7. Write a one-sentence description for each
8. Set a realistic duration_hours based on the place type
9. Do NOT repeat places used on previous days{used_clause}

Respond with ONLY a JSON array of 2-5 objects:
[{{"period": "morning", "name": "<exact name from list>", "type": "<category>", "description": "<one sentence>", "duration": "<hours>", "duration_hours": <number>}}, ...]
"""

        try:
            response = await self.model.ainvoke([
                {"role": "system", "content": "You are a knowledgeable travel planner. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ])
            content = response.content if isinstance(response.content, str) else str(response.content)
            json_match = re.search(r"\[[\s\S]*\]", content)
            if json_match:
                curated = json.loads(json_match.group())
                if isinstance(curated, list) and len(curated) >= 2:
                    # Enrich curated activities with real place data
                    enriched = await self._enrich_activities(curated, places)
                    # Sort by proximity (greedy nearest-neighbor)
                    return self._sort_by_proximity(enriched)
        except Exception as e:
            logger.error(f"[ITINERARY_BUILDER] LLM curation failed: {e}")

        # Fallback: pick top 3 by rating
        return self._pick_top_3(places)

    async def _enrich_activities(self, curated: list[dict], places: list[dict]) -> list[dict]:
        """Enrich LLM-curated activities with real place data from search results.

        Resolves photo references to direct image URLs for each activity.
        """
        from app.services.google_places import google_places

        enriched = []
        for c in curated:
            name = c.get("name", "")
            # Find matching place from search results
            matching = None
            for p in places:
                if p.get("name", "").lower() == name.lower() or name.lower() in p.get("name", "").lower():
                    matching = p
                    break

            if matching:
                c["placeId"] = matching.get("placeId", "")
                c["coordinates"] = matching.get("coordinates", {})
                c["rating"] = matching.get("rating")
                c["address"] = matching.get("address", "")
                c["website"] = matching.get("website", "")
                c["phone"] = matching.get("phone", "")
                if not c.get("description"):
                    c["description"] = matching.get("description", "")

                # Resolve photo URL if it's a reference, not a direct URL
                photo_url = matching.get("photo_url", "")
                if photo_url and not photo_url.startswith("http"):
                    try:
                        resolved = await google_places.resolve_photo_url(photo_url)
                        if resolved:
                            c["photo_url"] = resolved
                        else:
                            c["photo_url"] = None
                    except Exception:
                        c["photo_url"] = None
                else:
                    c["photo_url"] = photo_url or None

            enriched.append(c)

        return enriched

    @staticmethod
    def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Approximate distance in km between two lat/lng points."""
        import math
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        return R * 2 * math.asin(math.sqrt(a))

    def _sort_by_proximity(self, activities: list[dict]) -> list[dict]:
        """Sort activities by greedy nearest-neighbor using coordinates.

        Starts from the first activity and repeatedly picks the closest
        unvisited activity, producing a route that minimizes total transit.
        """
        if len(activities) <= 1:
            return activities

        def get_coords(a: dict) -> tuple[float, float]:
            c = a.get("coordinates", {})
            if c and c.get("lat") and c.get("lng"):
                return c["lat"], c["lng"]
            return 0.0, 0.0

        result = [activities[0]]
        remaining = list(activities[1:])
        while remaining:
            last = get_coords(result[-1])
            nearest_idx = 0
            nearest_dist = float("inf")
            for i, a in enumerate(remaining):
                coords = get_coords(a)
                dist = self._haversine_km(last[0], last[1], coords[0], coords[1])
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest_idx = i
            result.append(remaining.pop(nearest_idx))
        return result

    def _pick_top_3(self, places: list[dict]) -> list[dict]:
        """Fallback: pick top 3 places by rating."""
        sorted_places = sorted(places, key=lambda p: p.get("rating") or 0, reverse=True)
        periods = ["morning", "afternoon", "evening"]
        result = []
        for i, p in enumerate(sorted_places[:3]):
            result.append({
                "period": periods[i],
                "name": p.get("name", "Free time"),
                "type": ", ".join(p.get("types", [])[:2]) if p.get("types") else "attraction",
                "description": p.get("description", "")[:100],
                "duration": "2-3 hours",
                "placeId": p.get("placeId", ""),
                "coordinates": p.get("coordinates", {}),
                "rating": p.get("rating"),
                "address": p.get("address", ""),
                "photo_url": p.get("photo_url", ""),
            })
        return result

    def _llm_fallback_activities(self, city: str, day_num: int, total_days: int, trip_style: str) -> list[dict]:
        """Last resort: generate generic activities without real place data."""
        return [
            {"period": "morning", "name": f"Explore {city}", "type": "sightseeing", "description": f"Start your day exploring the highlights of {city}.", "duration": "2-3 hours"},
            {"period": "afternoon", "name": f"Local experience in {city}", "type": "culture", "description": f"Immerse yourself in the local culture and cuisine of {city}.", "duration": "2-3 hours"},
            {"period": "evening", "name": f"Evening in {city}", "type": "relaxation", "description": f"Wind down and enjoy the evening atmosphere of {city}.", "duration": "1-2 hours"},
        ]

    def _activity_to_time_slot(self, act_data: dict, prev_end: str = "09:00") -> TimeSlot:
        """Convert an activity dict to a TimeSlot with a populated Activity.

        Calculates startTime/endTime from duration_hours if available,
        chaining from the previous activity's end time.
        """
        period = act_data.get("period", "morning")
        coords = act_data.get("coordinates", {})
        photo_url = act_data.get("photo_url") or act_data.get("imageUrl")

        # Calculate time range from duration_hours
        duration_hours = act_data.get("duration_hours")
        start_time = act_data.get("startTime") or prev_end
        if duration_hours:
            end_time = self._add_hours(start_time, duration_hours)
        else:
            end_time = act_data.get("endTime") or self._default_end_time(period)

        activity = Activity(
            name=act_data.get("name", "Free time"),
            title=act_data.get("name", "Free time"),
            type=act_data.get("type", ""),
            description=act_data.get("description", ""),
            duration=act_data.get("duration", ""),
            rating=act_data.get("rating"),
            placeId=act_data.get("placeId"),
            address=act_data.get("address"),
            coordinates=coords if coords else None,
            imageUrl=photo_url,
            photos=[photo_url] if photo_url else None,
            location=ActivityLocation(
                name=act_data.get("name", ""),
                address=act_data.get("address", ""),
                coordinates=coords if coords else {"lat": 0, "lng": 0},
            ),
            websiteUrl=act_data.get("website"),
            phoneNumber=act_data.get("phone"),
        )
        return TimeSlot(
            period=period,
            startTime=start_time,
            endTime=end_time,
            activity=activity,
            label=period.capitalize(),
            time=f"{start_time}-{end_time}",
            activities=[activity],
        )

    @staticmethod
    def _add_hours(time_str: str, hours: float) -> str:
        """Add hours to a HH:MM time string, returning HH:MM."""
        try:
            h, m = map(int, time_str.split(":"))
            total = h * 60 + m + int(hours * 60)
            total = total % (24 * 60)
            return f"{total // 60:02d}:{total % 60:02d}"
        except Exception:
            return "18:00"

    @staticmethod
    def _default_end_time(period: str) -> str:
        """Default end time for a period when no duration is specified."""
        defaults = {"morning": "12:00", "afternoon": "18:00", "evening": "22:00"}
        return defaults.get(period, "18:00")

    async def _build_single_city(self, ctx: dict) -> dict:
        destination = ctx["destination"]
        duration = ctx["duration"]
        start_date = ctx.get("startDate")
        trip_style = ctx.get("tripStyle", "balanced")
        help_with = ctx.get("helpWith", [])

        itinerary = create_itinerary(destination, duration, start_date)

        if ctx.get("preferences"):
            itinerary.tripMetadata.preferences = ctx["preferences"]
        if ctx.get("travelType"):
            itinerary.tripMetadata.travelType = ctx["travelType"]

        used_names: list[str] = []
        for i, day in enumerate(itinerary.days):
            day.subtitle = self._generate_day_description(destination, i + 1, duration, trip_style)
            activities = await self._search_and_curate_activities(
                destination, i + 1, duration, trip_style, help_with, [destination], used_names
            )
            for a in activities:
                name = a.get("name", "")
                if name:
                    used_names.append(name)
            # Chain time slots: each activity starts after the previous ends
            time_slots = []
            prev_end = "09:00"
            for a in activities:
                slot = self._activity_to_time_slot(a, prev_end)
                prev_end = slot.endTime
                time_slots.append(slot)
            day.timeSlots = time_slots

        # Fetch hotel and restaurant recommendations for the city
        hotels, restaurants = await self._search_hotels_and_restaurants(destination)
        itinerary.hotelRecommendations = hotels
        itinerary.restaurantRecommendations = restaurants

        # Search flights if start location and dates are available
        flights = await self._search_flights_for_trip(ctx)
        itinerary.flightOptions = flights

        return {"itinerary": itinerary.model_dump()}

    async def _build_multi_city(self, ctx: dict) -> dict:
        cities = ctx["cities"]
        total_days = ctx.get("totalDays") or sum(c["days"] for c in cities)
        start_date = ctx.get("startDate")
        trip_style = ctx.get("tripStyle", "balanced")
        help_with = ctx.get("helpWith", [])
        all_city_names = [c["name"] for c in cities]

        itinerary = create_itinerary(cities[0]["name"], total_days, start_date)

        day_idx = 0
        used_names: list[str] = []
        current_city = None
        for city in cities:
            if city["name"] != current_city:
                used_names = []
                current_city = city["name"]
            city_days = city["days"]
            for d in range(city_days):
                if day_idx < len(itinerary.days):
                    day = itinerary.days[day_idx]
                    day.location = city["name"]
                    day.title = f"Day {day_idx + 1} - {city['name']}"
                    day.subtitle = self._generate_day_description(city["name"], day_idx + 1, total_days, trip_style)
                    activities = await self._search_and_curate_activities(
                        city["name"], day_idx + 1, total_days, trip_style, help_with, all_city_names, used_names
                    )
                    for a in activities:
                        name = a.get("name", "")
                        if name:
                            used_names.append(name)
                    # Chain time slots: each activity starts after the previous ends
                    time_slots = []
                    prev_end = "09:00"
                    for a in activities:
                        slot = self._activity_to_time_slot(a, prev_end)
                        prev_end = slot.endTime
                        time_slots.append(slot)
                    day.timeSlots = time_slots
                day_idx += 1

        if ctx.get("preferences"):
            itinerary.tripMetadata.preferences = ctx["preferences"]
        if ctx.get("travelType"):
            itinerary.tripMetadata.travelType = ctx["travelType"]

        # Fetch hotel and restaurant recommendations per city
        all_hotels: list[HotelRecommendation] = []
        all_restaurants: list[RestaurantRecommendation] = []
        for city in cities:
            hotels, restaurants = await self._search_hotels_and_restaurants(city["name"])
            all_hotels.extend(hotels)
            all_restaurants.extend(restaurants)
        itinerary.hotelRecommendations = all_hotels
        itinerary.restaurantRecommendations = all_restaurants

        # Search flights if start location and dates are available
        flights = await self._search_flights_for_trip(ctx)
        itinerary.flightOptions = flights

        return {"itinerary": itinerary.model_dump()}

    async def _build_with_travel_means(self, ctx: dict) -> dict:
        result = await self._build_multi_city(ctx)
        if not result:
            return None

        try:
            from app.services.travel_means import travel_means_service
            cities = ctx["cities"]
            start_location = ctx.get("startLocation")
            if isinstance(start_location, dict):
                start_location = start_location.get("name", cities[0]["name"])

            travel_means = await travel_means_service.calculate_travel_means(
                start_location=start_location or cities[0]["name"],
                cities=[c["name"] for c in cities],
                start_date=datetime.fromisoformat(ctx["startDate"]) if ctx.get("startDate") else datetime.now(),
                total_days=ctx.get("totalDays") or sum(c["days"] for c in cities),
                passengers=ctx.get("numberOfPeople", 1),
                preferences=ctx.get("travelPreferences"),
            )
            return {"itinerary": result["itinerary"], "travelMeans": travel_means}
        except Exception as e:
            logger.error(f"Travel means calculation failed: {e}")
            return result

    def _generate_day_description(self, city: str, day_num: int, total_days: int, trip_style: str = "balanced") -> str:
        style_hints = {
            "beaches": ["relax by the coast and enjoy the ocean breeze", "unwind by the water and soak up the sun", "take a leisurely stroll along the shore", "enjoy the beach at your own pace"],
            "culture": ["explore historic sites and immerse in local traditions", "wander through old quarters and discover hidden temples", "visit museums and learn the city's story", "experience the local arts and heritage scene"],
            "wellness": ["focus on rejuvenation and mindful exploration", "start the day with a calm walk and a healthy breakfast", "treat yourself to a spa session and quiet reflection", "find a peaceful spot and recharge"],
            "adventure": ["get outdoors and seek out active experiences", "challenge yourself with a hike or a water sport", "push your limits with something new", "explore the wilder side of the destination"],
            "food": ["discover local flavors and hidden culinary gems", "hunt down the best street food and local markets", "try a cooking class or a food tour", "dine where the locals dine"],
            "city": ["wander through neighborhoods and soak in the urban energy", "explore a different district and its character", "hop between cafes, shops, and galleries", "get lost in the city's rhythm"],
            "balanced": ["balance sightseeing with time to wander", "mix a must-see landmark with a quiet afternoon", "explore at a comfortable pace with room for spontaneity", "split the day between planned stops and free exploration"],
        }
        hints = style_hints.get(trip_style, style_hints["balanced"])
        activity_hint = hints[(day_num - 1) % len(hints)]

        if day_num == 1:
            return f"Arrive in {city}, settle in, and start to {activity_hint}. Keep the first day light to adjust."
        elif day_num == total_days:
            return f"Final day in {city} — wrap up with any last visits and {activity_hint} before departure."
        elif day_num == total_days - 1 and total_days > 2:
            return f"Make the most of your last full day in {city}. {activity_hint.capitalize()} with a relaxed pace."
        elif day_num == 2:
            return f"Get into the rhythm of {city} — {activity_hint} and start exploring in earnest."
        elif day_num == 3:
            return f"Go deeper into {city}. {activity_hint.capitalize()} and discover something unexpected."
        else:
            return f"Another day in {city} — {activity_hint} and see where the day takes you."

    async def _search_flights_for_trip(self, ctx: dict) -> list[FlightOption]:
        """Search for flights if SerpApi is configured and we have start location + dates.

        Gracefully skips if SerpApi key is missing or no dates/start location.
        """
        from app.services.serpapi_provider import serpapi_provider

        if not settings.serpapi_api_key:
            logger.debug("[ITINERARY_BUILDER] Skipping flights — no SerpApi key")
            return []

        start_location = ctx.get("startLocation")
        if isinstance(start_location, dict):
            start_location = start_location.get("name")
        if not start_location:
            logger.debug("[ITINERARY_BUILDER] Skipping flights — no start location")
            return []

        start_date = ctx.get("startDate")
        if not start_date:
            logger.debug("[ITINERARY_BUILDER] Skipping flights — no start date")
            return []

        cities = ctx.get("cities") or []
        if cities:
            destination_city = cities[0]["name"]
            total_days = ctx.get("totalDays") or sum(c["days"] for c in cities)
        else:
            destination_city = ctx.get("destination", "")
            total_days = ctx.get("duration", 1)

        if not destination_city:
            return []

        # Calculate return date
        try:
            dep_date = datetime.fromisoformat(start_date).date()
            ret_date = dep_date + timedelta(days=total_days)
            return_date = ret_date.isoformat()
        except Exception:
            return_date = None

        # Resolve airport codes via autocomplete
        origin_code = await self._resolve_airport_code(start_location)
        dest_code = await self._resolve_airport_code(destination_city)
        if not origin_code or not dest_code:
            logger.warning(
                f"[ITINERARY_BUILDER] Could not resolve airport codes: "
                f"{start_location}→{destination_city}"
            )
            return []

        adults = ctx.get("numberOfPeople", 1)
        travel_class = "economy"
        prefs = ctx.get("travelPreferences") or {}
        if prefs.get("cabinClass"):
            travel_class = prefs["cabinClass"]

        try:
            flights_data = await serpapi_provider.search_flights(
                origin=origin_code,
                destination=dest_code,
                departure_date=start_date[:10],
                return_date=return_date,
                adults=adults,
                travel_class=travel_class,
            )
        except Exception as e:
            logger.error(f"[ITINERARY_BUILDER] Flight search failed: {e}")
            return []

        # Convert to FlightOption models (top 3)
        flight_models = []
        for f in flights_data[:3]:
            flight_models.append(FlightOption(
                id=f.get("id", ""),
                legs=f.get("legs", []),
                layovers=f.get("layovers", []),
                totalDuration=f.get("totalDuration", 0),
                price=f.get("price", 0),
                currency=f.get("currency", "USD"),
                type=f.get("type", ""),
                isBest=f.get("isBest", False),
                bookingLink=f.get("bookingLink", ""),
            ))

        logger.info(
            f"[ITINERARY_BUILDER] Flights {start_location}→{destination_city}: "
            f"{len(flight_models)} options"
        )
        return flight_models

    @staticmethod
    async def _resolve_airport_code(city_name: str) -> str | None:
        """Resolve a city name to an airport code via SerpApi autocomplete."""
        from app.services.serpapi_provider import serpapi_provider

        if not city_name:
            return None
        try:
            suggestions = await serpapi_provider.autocomplete(city_name)
            if suggestions:
                return suggestions[0].get("code", "")
        except Exception as e:
            logger.warning(f"[ITINERARY_BUILDER] Airport code resolution failed for {city_name}: {e}")
        return None

    async def _search_hotels_and_restaurants(self, city: str) -> tuple[list[HotelRecommendation], list[RestaurantRecommendation]]:
        """Search for top hotels and restaurants in a city.

        Uses Google Places Text Search API directly for richer results,
        falling back to places_search if no API key.
        """
        from app.services.google_places import google_places

        hotel_queries = generate_hotel_queries(city)
        restaurant_queries = generate_restaurant_queries(city)

        # Try text_search first (returns up to 20 results per query)
        if settings.google_places_api_key:
            hotel_tasks = [google_places.text_search(q, limit=5) for q in hotel_queries]
            restaurant_tasks = [google_places.text_search(q, limit=5) for q in restaurant_queries]
            hotel_results, restaurant_results = await asyncio.gather(
                asyncio.gather(*hotel_tasks, return_exceptions=True),
                asyncio.gather(*restaurant_tasks, return_exceptions=True),
            )
            hotel_places = []
            for r in hotel_results:
                if isinstance(r, list):
                    hotel_places.extend(r)
            restaurant_places = []
            for r in restaurant_results:
                if isinstance(r, list):
                    restaurant_places.extend(r)
        else:
            # Fallback to places_search (MCP → OpenTripMap)
            hotel_places, restaurant_places = await asyncio.gather(
                places_search.search_multiple(hotel_queries, city, limit_per_query=3),
                places_search.search_multiple(restaurant_queries, city, limit_per_query=3),
            )

        # Deduplicate by placeId and pick top 5 by rating
        hotels = self._dedupe_and_rank(hotel_places, max_results=5)
        restaurants = self._dedupe_and_rank(restaurant_places, max_results=5)

        # Resolve photos and build model instances
        hotel_models = []
        for h in hotels:
            photo_url = h.get("photo_url", "")
            if photo_url and not photo_url.startswith("http"):
                try:
                    resolved = await google_places.resolve_photo_url(photo_url)
                    if resolved:
                        photo_url = resolved
                except Exception:
                    photo_url = None
            else:
                photo_url = photo_url or None

            hotel_models.append(HotelRecommendation(
                name=h.get("name", ""),
                placeId=h.get("placeId"),
                address=h.get("address"),
                rating=h.get("rating"),
                imageUrl=photo_url,
                website=h.get("website"),
                phone=h.get("phone"),
                coordinates=h.get("coordinates"),
                description=h.get("description"),
            ))

        restaurant_models = []
        for r in restaurants:
            photo_url = r.get("photo_url", "")
            if photo_url and not photo_url.startswith("http"):
                try:
                    resolved = await google_places.resolve_photo_url(photo_url)
                    if resolved:
                        photo_url = resolved
                except Exception:
                    photo_url = None
            else:
                photo_url = photo_url or None

            # Extract cuisine from types
            types = r.get("types", [])
            cuisine = None
            for t in types:
                if t in ("restaurant", "cafe", "bar", "meal_takeaway", "bakery"):
                    cuisine = t.replace("_", " ").title()
                    break

            restaurant_models.append(RestaurantRecommendation(
                name=r.get("name", ""),
                placeId=r.get("placeId"),
                address=r.get("address"),
                rating=r.get("rating"),
                imageUrl=photo_url,
                cuisine=cuisine,
                website=r.get("website"),
                phone=r.get("phone"),
                coordinates=r.get("coordinates"),
                description=r.get("description"),
            ))

        logger.info(
            f"[ITINERARY_BUILDER] Hotels/restaurants for {city}: "
            f"{len(hotel_models)} hotels, {len(restaurant_models)} restaurants"
        )
        return hotel_models, restaurant_models

    @staticmethod
    def _dedupe_and_rank(places: list[dict], max_results: int = 5) -> list[dict]:
        """Deduplicate places by placeId and rank by rating."""
        seen_ids = set()
        seen_names = set()
        unique = []
        for p in places:
            pid = p.get("placeId", "")
            name = p.get("name", "").lower()
            if pid and pid in seen_ids:
                continue
            if name and name in seen_names:
                continue
            if pid:
                seen_ids.add(pid)
            if name:
                seen_names.add(name)
            unique.append(p)
        ranked = sorted(unique, key=lambda p: p.get("rating") or 0, reverse=True)
        return ranked[:max_results]

    def compute_day_signature(self, day: DayPlan) -> str:
        slot_count = len(day.timeSlots)
        city = day.location or "unknown"
        date = day.date or ""
        pace = sum(len(ts.activities) or (1 if ts.activity else 0) for ts in day.timeSlots)
        return f"{city}|{date}|{slot_count}|{pace}"

    async def build_delta(
        self,
        existing_itinerary: dict | None,
        required_days: list[dict],
        invalidated_cities: list[str] | None = None,
    ) -> dict:
        invalidated_cities = invalidated_cities or []

        if not existing_itinerary or not existing_itinerary.get("days"):
            itinerary = create_itinerary(
                required_days[0].get("location", "Unknown") if required_days else "Unknown",
                len(required_days),
                required_days[0].get("date") if required_days else None,
            )
            for i, d in enumerate(required_days):
                day = DayPlan(**d)
                day.signature = self.compute_day_signature(day)
                itinerary.days[i] = day
            return {
                "itinerary": itinerary.model_dump(),
                "reusedDayKeys": [],
                "newDayKeys": [d.signature for d in itinerary.days],
            }

        existing_by_sig = {}
        for day_data in existing_itinerary["days"]:
            day = DayPlan(**day_data)
            sig = day.signature or self.compute_day_signature(day)
            existing_by_sig[sig] = day

        reused = []
        new_keys = []
        final_days = []

        for req_day_data in required_days:
            req_day = DayPlan(**req_day_data)
            sig = self.compute_day_signature(req_day)
            existing = existing_by_sig.get(sig)
            is_invalidated = invalidated_cities and (req_day.location or "") in invalidated_cities

            if existing and not is_invalidated:
                final_days.append(existing)
                reused.append(sig)
            else:
                req_day.signature = sig
                final_days.append(req_day)
                new_keys.append(sig)

        # Re-pin pinned activities from invalidated days
        if invalidated_cities and existing_itinerary:
            for old_day_data in existing_itinerary["days"]:
                old_day = DayPlan(**old_day_data)
                if (old_day.location or "") in invalidated_cities:
                    for ts in old_day.timeSlots:
                        activities = ts.activities or ([ts.activity] if ts.activity else [])
                        for act in activities:
                            if act.metadata and act.metadata.get("pinned"):
                                target = next((d for d in final_days if d.location == old_day.location), None)
                                if target and target.timeSlots:
                                    slot = target.timeSlots[0]
                                    slot.activities.insert(0, act)

        for i, d in enumerate(final_days):
            d.dayNumber = i + 1

        itinerary_data = {**existing_itinerary, "days": [d.model_dump() for d in final_days]}
        return {"itinerary": itinerary_data, "reusedDayKeys": reused, "newDayKeys": new_keys}


itinerary_builder = ItineraryBuilder()
