"""All 80 benchmark test cases for the TripWhat travel agent.

Each test case defines:
- A sequence of turns (user messages)
- Expected assertions after each turn (slots filled, tools called, interrupts)
- Final assertions (itinerary structure, response quality)

Categories:
  1. Chitchat & Deflection (8)
  2. Questions & Recommendations (12)
  3. Search-Only (8)
  4. Onboarding Single-Turn (10)
  5. Onboarding Multi-Turn (10)
  6. "You Decide" (6)
  7. Dates Edge Cases (6)
  8. Route Confirm/Reject/Build (8)
  9. Post-Build Editing (8)
 10. Post-Build Questions (4)
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Turn:
    """A single turn in a conversation."""
    user_message: str
    # Assertions checked after this turn's response
    expected_slots_filled: list[str] = field(default_factory=list)
    expected_slots_not_filled: list[str] = field(default_factory=list)
    expected_tools_called: list[str] = field(default_factory=list)  # at least these
    expected_tools_not_called: list[str] = field(default_factory=list)
    expected_interrupt: bool = False
    expected_response_contains: list[str] = field(default_factory=list)  # case-insensitive substrings
    expected_response_not_contains: list[str] = field(default_factory=list)
    expected_itinerary_days: int | None = None  # if itinerary should exist
    expected_route_cities: list[str] | None = None  # if route should be proposed


@dataclass
class TestCase:
    """A complete test case (single or multi-turn)."""
    id: str
    category: str
    description: str
    turns: list[Turn]
    # Whether to run LLM-as-judge on the final response
    llm_judge: bool = True
    # Whether this case requires a running server
    requires_server: bool = True


# ============================================================
# Category 1: Chitchat & Deflection (8 cases)
# ============================================================

CHITCHAT_CASES = [
    TestCase(
        id="chat-01",
        category="chitchat",
        description="Simple greeting",
        turns=[
            Turn(
                user_message="hi",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route", "build_itinerary"],
                expected_response_not_contains=["Where would you like to go?"],
            ),
        ],
    ),
    TestCase(
        id="chat-02",
        category="chitchat",
        description="Casual hey",
        turns=[
            Turn(
                user_message="hey there",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
                expected_response_not_contains=["Where would you like to go?"],
            ),
        ],
    ),
    TestCase(
        id="chat-03",
        category="chitchat",
        description="Non-travel question: math",
        turns=[
            Turn(
                user_message="what's 2+2?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route", "build_itinerary"],
                expected_response_not_contains=["4", "four"],  # should NOT answer the math question
            ),
        ],
    ),
    TestCase(
        id="chat-04",
        category="chitchat",
        description="Non-travel question: write a poem",
        turns=[
            Turn(
                user_message="write me a poem about the ocean",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
                expected_response_not_contains=["Roses are red", "waves crash"],  # should NOT write a poem
            ),
        ],
    ),
    TestCase(
        id="chat-05",
        category="chitchat",
        description="Non-travel question: tell me a joke",
        turns=[
            Turn(
                user_message="tell me a joke",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="chat-06",
        category="chitchat",
        description="Programming question",
        turns=[
            Turn(
                user_message="how do I reverse a linked list in Python?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
                expected_response_not_contains=["def reverse", "prev = None", "class ListNode"],
            ),
        ],
    ),
    TestCase(
        id="chat-07",
        category="chitchat",
        description="What can you do?",
        turns=[
            Turn(
                user_message="what can you do?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="chat-08",
        category="chitchat",
        description="Philosophy question",
        turns=[
            Turn(
                user_message="what is the meaning of life?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
                expected_response_not_contains=["42", "Douglas Adams"],
            ),
        ],
    ),
]


# ============================================================
# Category 2: Questions & Recommendations (12 cases)
# ============================================================

QUESTION_CASES = [
    TestCase(
        id="q-01",
        category="questions",
        description="Recommend cities for December",
        turns=[
            Turn(
                user_message="what cities would you recommend I travel to in december?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route", "build_itinerary"],
                expected_response_not_contains=["Where would you like to go?"],
            ),
        ],
    ),
    TestCase(
        id="q-02",
        category="questions",
        description="Which cities in Italy for December (must NOT fill destination=Italy)",
        turns=[
            Turn(
                user_message="hey, which cities in italy would look the best in december?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route", "build_itinerary"],
                expected_response_not_contains=["Where would you like to go?"],
            ),
        ],
    ),
    TestCase(
        id="q-03",
        category="questions",
        description="Beach vacation recommendation",
        turns=[
            Turn(
                user_message="where should I go for a beach vacation in July?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-04",
        category="questions",
        description="Weather question about Tokyo",
        turns=[
            Turn(
                user_message="what's the weather like in Tokyo in October?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-05",
        category="questions",
        description="Visa question for Japan",
        turns=[
            Turn(
                user_message="do I need a visa for Japan?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-06",
        category="questions",
        description="Best things to do in Kyoto",
        turns=[
            Turn(
                user_message="what are the best things to do in Kyoto?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-07",
        category="questions",
        description="Airport to city center question",
        turns=[
            Turn(
                user_message="how do I get from the airport to the city center?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-08",
        category="questions",
        description="Safety question about solo travel",
        turns=[
            Turn(
                user_message="is Japan safe for solo travelers?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-09",
        category="questions",
        description="Best time to visit Iceland",
        turns=[
            Turn(
                user_message="what's the best time to visit Iceland?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-10",
        category="questions",
        description="Food-focused city recommendation in Asia",
        turns=[
            Turn(
                user_message="recommend a food-focused city in Asia",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-11",
        category="questions",
        description="Cheapest European cities",
        turns=[
            Turn(
                user_message="which European cities are cheapest to visit?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="q-12",
        category="questions",
        description="Travel documents for Thailand",
        turns=[
            Turn(
                user_message="what documents do I need to travel to Thailand?",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
]


# ============================================================
# Category 3: Search-Only (8 cases)
# ============================================================

SEARCH_CASES = [
    TestCase(
        id="search-01",
        category="search",
        description="Find hotels in Tokyo",
        turns=[
            Turn(
                user_message="find hotels in Tokyo",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route", "build_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="search-02",
        category="search",
        description="Best restaurants in Kyoto",
        turns=[
            Turn(
                user_message="best restaurants in Kyoto",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="search-03",
        category="search",
        description="Top attractions in Osaka",
        turns=[
            Turn(
                user_message="top attractions in Osaka",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="search-04",
        category="search",
        description="Show me temples in Kyoto",
        turns=[
            Turn(
                user_message="show me temples in Kyoto",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="search-05",
        category="search",
        description="Find ramen shops in Tokyo",
        turns=[
            Turn(
                user_message="find ramen shops in Tokyo",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="search-06",
        category="search",
        description="Search for nightlife in Seoul",
        turns=[
            Turn(
                user_message="search for nightlife in Seoul",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="search-07",
        category="search",
        description="Family-friendly activities in Singapore",
        turns=[
            Turn(
                user_message="find family-friendly activities in Singapore",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="search-08",
        category="search",
        description="Best cafes in Paris",
        turns=[
            Turn(
                user_message="best cafes in Paris",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
]


# ============================================================
# Category 4: Onboarding Single-Turn Complete (10 cases)
# ============================================================

ONBOARDING_SINGLE_CASES = [
    TestCase(
        id="ob-single-01",
        category="onboarding_single",
        description="3 day Kyoto trip, all slots in one message",
        turns=[
            Turn(
                user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Kyoto"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-02",
        category="onboarding_single",
        description="7 day Tokyo+Osaka trip",
        turns=[
            Turn(
                user_message="Plan a 7 day trip to Tokyo and Osaka, October 1-7, couple, food, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Tokyo", "Osaka"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-03",
        category="onboarding_single",
        description="5 day Paris trip, itinerary only",
        turns=[
            Turn(
                user_message="Take me to Paris for 5 days, December 10-14, solo, city, itinerary",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_slots_not_filled=["origin"],  # itinerary scope, not flights
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Paris"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-04",
        category="onboarding_single",
        description="4 day Seoul trip, friends, adventure",
        turns=[
            Turn(
                user_message="I want to go to Seoul for 4 days, November 20-23, friends, adventure, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Seoul"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-05",
        category="onboarding_single",
        description="Weekend Bangkok, food, restaurants scope",
        turns=[
            Turn(
                user_message="Plan a weekend in Bangkok, 2 days, solo, food, restaurants",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_slots_not_filled=["origin"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Bangkok"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-06",
        category="onboarding_single",
        description="14 day Japan multi-city trip",
        turns=[
            Turn(
                user_message="14 day trip to Japan, Tokyo Kyoto Osaka, March 1-14, family, culture, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Tokyo", "Kyoto", "Osaka"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-07",
        category="onboarding_single",
        description="3 day Kyoto with origin (flights scope)",
        turns=[
            Turn(
                user_message="3 day trip to Kyoto, October 15-17, solo, culture, everything from San Francisco",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with", "origin"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Kyoto"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-08",
        category="onboarding_single",
        description="5 day Lisbon, beaches, hotels scope",
        turns=[
            Turn(
                user_message="5 day trip to Lisbon, June 10-15, couple, beaches, hotels",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_slots_not_filled=["origin"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Lisbon"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-09",
        category="onboarding_single",
        description="10 day Vietnam multi-city trip",
        turns=[
            Turn(
                user_message="10 day trip to Vietnam, Hanoi and Ho Chi Minh City, January 5-15, solo, culture, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Hanoi", "Ho Chi Minh City"],
            ),
        ],
    ),
    TestCase(
        id="ob-single-10",
        category="onboarding_single",
        description="Weekend Amsterdam, friends, things_to_do scope",
        turns=[
            Turn(
                user_message="Weekend trip to Amsterdam, 2 days, friends, city, things_to_do",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_slots_not_filled=["origin"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Amsterdam"],
            ),
        ],
    ),
]


# ============================================================
# Category 5: Onboarding Multi-Turn (10 cases)
# ============================================================

ONBOARDING_MULTI_CASES = [
    TestCase(
        id="ob-multi-01",
        category="onboarding_multi",
        description="Start with destination only → ask for dates",
        turns=[
            Turn(
                user_message="I want to plan a trip to Tokyo",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route", "build_itinerary"],
                expected_response_not_contains=["Where would you like to go?"],  # destination already given
            ),
        ],
    ),
    TestCase(
        id="ob-multi-02",
        category="onboarding_multi",
        description="Start with just 'plan a trip' → ask for destination",
        turns=[
            Turn(
                user_message="I want to plan a trip",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-03",
        category="onboarding_multi",
        description="Start with 'take me to Paris' → ask for dates",
        turns=[
            Turn(
                user_message="Take me to Paris",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-04",
        category="onboarding_multi",
        description="3 days in Kyoto → ask for dates (dest+duration filled)",
        turns=[
            Turn(
                user_message="3 days in Kyoto",
                expected_slots_filled=["destination", "duration"],
                expected_slots_not_filled=["dates", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-05",
        category="onboarding_multi",
        description="Seoul 4 days → ask for dates",
        turns=[
            Turn(
                user_message="Plan a trip to Seoul, 4 days",
                expected_slots_filled=["destination", "duration"],
                expected_slots_not_filled=["dates", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-06",
        category="onboarding_multi",
        description="Tokyo for a week → ask for dates",
        turns=[
            Turn(
                user_message="I want to go to Tokyo for a week",
                expected_slots_filled=["destination", "duration"],
                expected_slots_not_filled=["dates", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-07",
        category="onboarding_multi",
        description="Trip to Bangkok → ask for dates",
        turns=[
            Turn(
                user_message="Trip to Bangkok",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-08",
        category="onboarding_multi",
        description="Trip to Italy → ask for dates (country, not city)",
        turns=[
            Turn(
                user_message="I want to plan a trip to Italy",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-09",
        category="onboarding_multi",
        description="'Take me somewhere warm' → ask for destination (NOT filled)",
        turns=[
            Turn(
                user_message="Take me somewhere warm",
                expected_slots_not_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status"],
                expected_tools_not_called=["fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="ob-multi-10",
        category="onboarding_multi",
        description="'5 days off, want to go somewhere' → ask for destination",
        turns=[
            Turn(
                user_message="I have 5 days off, want to go somewhere",
                expected_slots_filled=["duration"],
                expected_slots_not_filled=["destination", "dates", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
]


# ============================================================
# Category 6: "You Decide" (6 cases)
# ============================================================

YOU_DECIDE_CASES = [
    TestCase(
        id="yd-01",
        category="you_decide",
        description="You decide destination, 5 days, solo, culture, everything",
        turns=[
            Turn(
                user_message="I want to plan a trip, you decide the destination, 5 days, solo, culture, everything",
                expected_slots_filled=["destination", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
            ),
        ],
    ),
    TestCase(
        id="yd-02",
        category="you_decide",
        description="Surprise me, 7 days, couple, beaches, everything",
        turns=[
            Turn(
                user_message="Plan a trip for me, surprise me, 7 days, couple, beaches, everything",
                expected_slots_filled=["destination", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
            ),
        ],
    ),
    TestCase(
        id="yd-03",
        category="you_decide",
        description="You decide where, 3 days, solo, adventure, itinerary",
        turns=[
            Turn(
                user_message="Take me somewhere, you decide where, 3 days, solo, adventure, itinerary",
                expected_slots_filled=["destination", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
            ),
        ],
    ),
    TestCase(
        id="yd-04",
        category="you_decide",
        description="Not sure where, 4 days, friends, food, everything",
        turns=[
            Turn(
                user_message="I want a vacation, not sure where, 4 days, friends, food, everything",
                expected_slots_filled=["destination", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
            ),
        ],
    ),
    TestCase(
        id="yd-05",
        category="you_decide",
        description="Whatever you think is best, 5 days, solo, wellness, everything",
        turns=[
            Turn(
                user_message="Plan something, whatever you think is best, 5 days, solo, wellness, everything",
                expected_slots_filled=["destination", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
            ),
        ],
    ),
    TestCase(
        id="yd-06",
        category="you_decide",
        description="Don't know where, 10 days, family, culture, everything",
        turns=[
            Turn(
                user_message="I don't know where to go, you decide, 10 days, family, culture, everything",
                expected_slots_filled=["destination", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
            ),
        ],
    ),
]


# ============================================================
# Category 7: Dates Edge Cases (6 cases)
# ============================================================

DATES_CASES = [
    TestCase(
        id="dates-01",
        category="dates_edge",
        description="Specific dates → ask for actual dates (pending=fixed)",
        turns=[
            Turn(
                user_message="I want to plan a trip to Tokyo, I have specific dates",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="dates-02",
        category="dates_edge",
        description="Flexible dates → ask for month",
        turns=[
            Turn(
                user_message="Trip to Kyoto, I'm flexible on dates",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="dates-03",
        category="dates_edge",
        description="Not sure when → ask for month",
        turns=[
            Turn(
                user_message="Plan a trip to Osaka, not sure when yet",
                expected_slots_filled=["destination"],
                expected_slots_not_filled=["duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot"],
                expected_tools_not_called=["propose_route"],
            ),
        ],
    ),
    TestCase(
        id="dates-04",
        category="dates_edge",
        description="October specified → dates filled with concrete dates",
        turns=[
            Turn(
                user_message="Trip to Seoul, 3 days, October, solo, culture, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Seoul"],
            ),
        ],
    ),
    TestCase(
        id="dates-05",
        category="dates_edge",
        description="Specific dates with range → dates filled directly",
        turns=[
            Turn(
                user_message="Trip to Tokyo, I have specific dates, October 10-17, solo, culture, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Tokyo"],
            ),
        ],
    ),
    TestCase(
        id="dates-06",
        category="dates_edge",
        description="Flexible + December → dates filled with assumed dates",
        turns=[
            Turn(
                user_message="Trip to Paris, flexible, December, 5 days, solo, city, everything",
                expected_slots_filled=["destination", "dates", "duration", "travelers", "trip_style", "help_with"],
                expected_tools_called=["check_trip_status", "fill_trip_slot", "propose_route"],
                expected_interrupt=True,
                expected_route_cities=["Paris"],
            ),
        ],
    ),
]


# ============================================================
# Category 8: Route Confirm/Reject/Build (8 cases)
# ============================================================

ROUTE_FLOW_CASES = [
    TestCase(
        id="route-01",
        category="route_flow",
        description="Confirm with 'yes' → build itinerary",
        turns=[
            Turn(
                user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything",
                expected_interrupt=True,
                expected_route_cities=["Kyoto"],
            ),
            Turn(
                user_message="yes",
                expected_interrupt=False,
                expected_itinerary_days=3,
                expected_tools_called=["build_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="route-02",
        category="route_flow",
        description="Confirm with 'looks good, build it' → build itinerary",
        turns=[
            Turn(
                user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything",
                expected_interrupt=True,
            ),
            Turn(
                user_message="looks good, build it",
                expected_interrupt=False,
                expected_itinerary_days=3,
                expected_tools_called=["build_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="route-03",
        category="route_flow",
        description="Confirm with just 'build it' → build itinerary",
        turns=[
            Turn(
                user_message="I want to plan a 2 day trip to Osaka, October 20-21, solo, food, everything",
                expected_interrupt=True,
            ),
            Turn(
                user_message="build it",
                expected_interrupt=False,
                expected_itinerary_days=2,
                expected_tools_called=["build_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="route-04",
        category="route_flow",
        description="Confirm with 'perfect, let's do it' → build itinerary",
        turns=[
            Turn(
                user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything",
                expected_interrupt=True,
            ),
            Turn(
                user_message="perfect, let's do it",
                expected_interrupt=False,
                expected_itinerary_days=3,
                expected_tools_called=["build_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="route-05",
        category="route_flow",
        description="Multi-city confirm → itinerary with correct city splits",
        turns=[
            Turn(
                user_message="Plan a 7 day trip to Tokyo and Osaka, October 1-7, solo, culture, everything",
                expected_interrupt=True,
                expected_route_cities=["Tokyo", "Osaka"],
            ),
            Turn(
                user_message="yes, build it",
                expected_interrupt=False,
                expected_itinerary_days=7,
                expected_tools_called=["build_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="route-06",
        category="route_flow",
        description="Reject with 'more time in Tokyo' → re-proposed with preferences",
        turns=[
            Turn(
                user_message="Plan a 7 day trip to Tokyo and Osaka, October 1-7, solo, culture, everything",
                expected_interrupt=True,
            ),
            Turn(
                user_message="no, I want to spend more time in Tokyo, like 5 nights there and 1 in Osaka",
                expected_interrupt=True,  # new interrupt with re-proposed route
            ),
        ],
    ),
    TestCase(
        id="route-07",
        category="route_flow",
        description="Reject with explicit night split → re-proposed",
        turns=[
            Turn(
                user_message="Plan a 7 day trip to Tokyo and Osaka, October 1-7, solo, culture, everything",
                expected_interrupt=True,
            ),
            Turn(
                user_message="change it, 5 nights Tokyo 1 Osaka",
                expected_interrupt=True,
            ),
        ],
    ),
    TestCase(
        id="route-08",
        category="route_flow",
        description="Reject to add a city → re-proposed with 3 cities",
        turns=[
            Turn(
                user_message="Plan a 7 day trip to Tokyo and Osaka, October 1-7, solo, culture, everything",
                expected_interrupt=True,
            ),
            Turn(
                user_message="I want to add Kyoto to the route",
                expected_interrupt=True,
            ),
        ],
    ),
]


# ============================================================
# Category 9: Post-Build Editing (8 cases)
# ============================================================

# These all require a built itinerary first, then an edit command
POST_BUILD_EDIT_CASES = [
    TestCase(
        id="edit-01",
        category="post_build_edit",
        description="Add tea ceremony on day 1",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3, expected_tools_called=["build_itinerary"]),
            Turn(
                user_message="add a tea ceremony on day 1",
                expected_itinerary_days=3,
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-02",
        category="post_build_edit",
        description="Remove first activity on day 1",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="remove the first activity on day 1",
                expected_itinerary_days=3,
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-03",
        category="post_build_edit",
        description="Replace museum with park on day 2",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="replace the museum with a park on day 2",
                expected_itinerary_days=3,
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-04",
        category="post_build_edit",
        description="Move temple to day 3",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="move the temple to day 3",
                expected_itinerary_days=3,
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-05",
        category="post_build_edit",
        description="Add a day",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="add a day",
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-06",
        category="post_build_edit",
        description="Remove day 3",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="remove day 3",
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-07",
        category="post_build_edit",
        description="Add sushi restaurant on day 2 evening",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="add a sushi restaurant on day 2 evening",
                expected_itinerary_days=3,
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
    TestCase(
        id="edit-08",
        category="post_build_edit",
        description="Swap day 1 and day 2",
        turns=[
            Turn(user_message="I want to plan a 3 day trip to Kyoto, October 15-17, solo, culture, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=3),
            Turn(
                user_message="swap day 1 and day 2",
                expected_itinerary_days=3,
                expected_tools_called=["edit_itinerary"],
            ),
        ],
    ),
]


# ============================================================
# Category 10: Post-Build Questions (4 cases)
# ============================================================

POST_BUILD_QUESTION_CASES = [
    TestCase(
        id="pbq-01",
        category="post_build_question",
        description="Weather question after build",
        turns=[
            Turn(user_message="I want to plan a 2 day trip to Osaka, October 20-21, solo, food, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=2),
            Turn(
                user_message="what's the weather going to be like?",
                expected_itinerary_days=2,
                expected_tools_not_called=["edit_itinerary", "fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="pbq-02",
        category="post_build_question",
        description="Airport to hotel question after build",
        turns=[
            Turn(user_message="I want to plan a 2 day trip to Osaka, October 20-21, solo, food, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=2),
            Turn(
                user_message="how do I get from the airport to the hotel?",
                expected_itinerary_days=2,
                expected_tools_not_called=["edit_itinerary", "fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="pbq-03",
        category="post_build_question",
        description="What should I pack question after build",
        turns=[
            Turn(user_message="I want to plan a 2 day trip to Osaka, October 20-21, solo, food, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=2),
            Turn(
                user_message="what should I pack?",
                expected_itinerary_days=2,
                expected_tools_not_called=["edit_itinerary", "fill_trip_slot", "propose_route"],
            ),
        ],
    ),
    TestCase(
        id="pbq-04",
        category="post_build_question",
        description="Coffee shop near day 1 activities",
        turns=[
            Turn(user_message="I want to plan a 2 day trip to Osaka, October 20-21, solo, food, everything", expected_interrupt=True),
            Turn(user_message="yes, build it", expected_itinerary_days=2),
            Turn(
                user_message="is there a good coffee shop near day 1 activities?",
                expected_itinerary_days=2,
                expected_tools_not_called=["edit_itinerary", "fill_trip_slot", "propose_route"],
            ),
        ],
    ),
]


# ============================================================
# All Cases Combined
# ============================================================

ALL_CASES: list[TestCase] = (
    CHITCHAT_CASES
    + QUESTION_CASES
    + SEARCH_CASES
    + ONBOARDING_SINGLE_CASES
    + ONBOARDING_MULTI_CASES
    + YOU_DECIDE_CASES
    + DATES_CASES
    + ROUTE_FLOW_CASES
    + POST_BUILD_EDIT_CASES
    + POST_BUILD_QUESTION_CASES
)

# Category lookup
CATEGORIES = {
    "chitchat": CHITCHAT_CASES,
    "questions": QUESTION_CASES,
    "search": SEARCH_CASES,
    "onboarding_single": ONBOARDING_SINGLE_CASES,
    "onboarding_multi": ONBOARDING_MULTI_CASES,
    "you_decide": YOU_DECIDE_CASES,
    "dates_edge": DATES_CASES,
    "route_flow": ROUTE_FLOW_CASES,
    "post_build_edit": POST_BUILD_EDIT_CASES,
    "post_build_question": POST_BUILD_QUESTION_CASES,
}


def get_cases(category: str | None = None) -> list[TestCase]:
    """Get test cases, optionally filtered by category."""
    if category:
        return CATEGORIES.get(category, [])
    return ALL_CASES


def get_case(case_id: str) -> TestCase | None:
    """Get a single test case by ID."""
    for case in ALL_CASES:
        if case.id == case_id:
            return case
    return None
