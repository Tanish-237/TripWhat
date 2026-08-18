"""Procedural query generator — builds search queries from city + trip_style + help_with.

No LLM tokens spent on deciding what to search for.
Queries are generated deterministically from templates.
"""

QUERY_TEMPLATES: dict[str, list[str]] = {
    # By trip_style
    "culture": [
        "historic sites in {city}",
        "museums in {city}",
        "temples and shrines in {city}",
    ],
    "food": [
        "best restaurants in {city}",
        "food markets in {city}",
        "street food in {city}",
    ],
    "adventure": [
        "outdoor activities in {city}",
        "hiking trails near {city}",
        "parks and nature in {city}",
    ],
    "city": [
        "top attractions in {city}",
        "landmarks in {city}",
        "shopping districts in {city}",
    ],
    "beaches": [
        "beaches near {city}",
        "coastal attractions in {city}",
    ],
    "wellness": [
        "spas in {city}",
        "wellness centers in {city}",
        "parks and gardens in {city}",
    ],
    "balanced": [
        "top attractions in {city}",
        "museums in {city}",
        "best restaurants in {city}",
    ],
}

# By help_with category
HELP_WITH_TEMPLATES: dict[str, list[str]] = {
    "hotels": ["hotels in {city}"],
    "restaurants": ["best restaurants in {city}", "cafes in {city}"],
    "things_to_do": ["tourist attractions in {city}", "things to do in {city}"],
    "flights": [],  # Flights handled separately via web_search
}


def generate_queries(
    city: str,
    trip_style: str = "balanced",
    help_with: list[str] | None = None,
    day_num: int = 1,
    total_days: int = 1,
) -> list[str]:
    """Generate procedural search queries for a city.

    Args:
        city: City name (e.g., "Tokyo")
        trip_style: Trip style (e.g., "culture", "food", "balanced")
        help_with: List of help categories (e.g., ["itinerary", "hotels"])
        day_num: Current day number (1-indexed)
        total_days: Total days in the trip

    Returns:
        List of search query strings
    """
    queries: list[str] = []

    # Style-based queries
    style_queries = QUERY_TEMPLATES.get(trip_style, QUERY_TEMPLATES["balanced"])
    queries.extend(q.format(city=city) for q in style_queries)

    # Help-with-based queries
    if help_with:
        for hw in help_with:
            hw_queries = HELP_WITH_TEMPLATES.get(hw, [])
            queries.extend(q.format(city=city) for q in hw_queries)

    # Day-specific queries for variety
    if day_num > 1 and total_days > 1:
        # For later days, add variety queries
        variety_queries = [
            "hidden gems in {city}",
            "local favorites in {city}",
            "neighborhoods to explore in {city}",
        ]
        idx = (day_num - 2) % len(variety_queries)
        queries.append(variety_queries[idx].format(city=city))

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            unique.append(q)

    return unique


def generate_restaurant_queries(city: str) -> list[str]:
    """Generate restaurant-specific queries for meal slots."""
    return [
        f"best restaurants in {city}",
        f"lunch spots in {city}",
        f"dinner restaurants in {city}",
    ]


def generate_hotel_queries(city: str) -> list[str]:
    """Generate hotel-specific queries."""
    return [
        f"best hotels in {city}",
        f"top rated hotels in {city}",
        f"hotels near city center {city}",
    ]
