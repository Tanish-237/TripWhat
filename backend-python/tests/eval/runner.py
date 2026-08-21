"""Core evaluation runner — executes test cases against the live HTTP server.

For each test case:
1. Creates a fresh user + conversation
2. Sends each turn via the HTTP API
3. Collects: response text, trip_state, tool calls (from LangSmith traces), interrupts
4. Runs deterministic assertions
5. Returns structured results
"""

import asyncio
import time
import uuid
import httpx
from dataclasses import dataclass, field
from typing import Any

from .test_cases import TestCase, Turn


@dataclass
class TurnResult:
    """Result of a single turn."""
    user_message: str
    response: str = ""
    trip_state: dict | None = None
    interrupt: dict | None = None
    tool_calls: list[str] = field(default_factory=list)
    slots_filled: list[str] = field(default_factory=list)
    itinerary_days: int | None = None
    route_cities: list[str] = field(default_factory=list)
    error: str | None = None
    timeout: bool = False
    raw_events: list[dict] = field(default_factory=list)


@dataclass
class CaseResult:
    """Result of a complete test case (all turns)."""
    case_id: str
    category: str
    description: str
    turns: list[TurnResult] = field(default_factory=list)
    assertions: list[dict] = field(default_factory=list)  # {type, passed, expected, actual, message}
    llm_judge_scores: dict = field(default_factory=dict)
    passed: bool = False
    duration_seconds: float = 0.0


class Conversation:
    """Multi-turn conversation helper that tracks lastEventId between turns."""

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.conv_id = str(uuid.uuid4())
        self.last_event_id = "0"
        self._prev_itinerary_days: int | None = None

    async def send(self, message: str, timeout_seconds: int = 120) -> TurnResult:
        """Send a message and wait for the response."""
        headers = {"Authorization": f"Bearer {self.token}"}
        result = TurnResult(user_message=message)

        async with httpx.AsyncClient(timeout=120.0, trust_env=False) as c:
            # Get current last event ID to avoid reading old events
            r = await c.get(
                f"{self.base_url}/api/chat/stream/{self.conv_id}",
                params={"after": self.last_event_id},
                headers=headers,
            )
            if r.status_code == 200 and r.json().get("events"):
                self.last_event_id = r.json().get("lastEventId", self.last_event_id)

            # Send the message
            r = await c.post(
                f"{self.base_url}/api/chat",
                json={"message": message, "conversationId": self.conv_id},
                headers=headers,
            )
            if r.status_code != 200:
                result.error = f"POST /api/chat failed: {r.status_code} {r.text[:200]}"
                return result

            # Poll for events
            events: list[dict] = []
            after = self.last_event_id
            start = time.time()
            for _ in range(timeout_seconds * 2):
                await asyncio.sleep(0.5)
                if time.time() - start > timeout_seconds:
                    result.timeout = True
                    break
                r = await c.get(
                    f"{self.base_url}/api/chat/stream/{self.conv_id}",
                    params={"after": after},
                    headers=headers,
                )
                if r.status_code != 200:
                    continue
                data = r.json()
                new = data.get("events", [])
                if new:
                    events.extend(new)
                    after = data.get("lastEventId", after)
                    for e in new:
                        if e.get("type") in ("response", "interrupt"):
                            self.last_event_id = after
                            result.raw_events = events
                            self._extract(result, events)
                            return result
                if not data.get("isActive") and events:
                    self.last_event_id = after
                    result.raw_events = events
                    self._extract(result, events)
                    return result

            self.last_event_id = after
            result.raw_events = events
            self._extract(result, events)
            return result

    def _extract(self, result: TurnResult, events: list[dict]):
        """Extract response, trip_state, interrupt, tool_calls from events.

        Tool calls are inferred from trip_state changes since the server
        doesn't emit explicit tool_call events:
        - check_trip_status: always assumed called (agent always calls it first)
        - fill_trip_slot: inferred if slots are filled
        - propose_route: inferred if routeProposal exists
        - build_itinerary: inferred if itinerary exists and didn't before
        - edit_itinerary: inferred if itinerary changed between turns
        """
        tokens: list[str] = []
        response_msg: str | None = None
        trip_state: dict | None = None
        interrupt_payload: dict | None = None
        tool_calls: list[str] = []

        for e in events:
            etype = e.get("type", "")
            data = e.get("data", {})
            if etype == "token":
                tokens.append(data.get("text", ""))
            elif etype == "tripState":
                trip_state = data.get("tripState", trip_state)
            elif etype == "response":
                response_msg = data.get("message", "")
                trip_state = data.get("tripState", trip_state)
            elif etype == "interrupt":
                interrupt_payload = data.get("payload", interrupt_payload)
                # Interrupt payloads contain the tripState — extract it
                if isinstance(interrupt_payload, dict) and interrupt_payload.get("tripState"):
                    trip_state = interrupt_payload["tripState"]

        result.response = response_msg or "".join(tokens)
        result.trip_state = trip_state
        result.interrupt = interrupt_payload

        # Infer tool calls from trip_state
        inferred_tools: list[str] = ["check_trip_status"]  # always called first

        if trip_state:
            onboarding = trip_state.get("onboarding", {})
            slots = onboarding.get("slotsFilled", {})
            if isinstance(slots, dict):
                result.slots_filled = list(slots.keys())
            elif isinstance(slots, list):
                result.slots_filled = slots
            else:
                result.slots_filled = []

            if result.slots_filled:
                inferred_tools.append("fill_trip_slot")

            # Extract itinerary days
            if trip_state.get("itinerary"):
                days = trip_state["itinerary"].get("days", [])
                result.itinerary_days = len(days)
                # Check if this is a new build or an edit
                if self._prev_itinerary_days is None:
                    inferred_tools.append("build_itinerary")
                elif len(days) != self._prev_itinerary_days:
                    inferred_tools.append("edit_itinerary")
                else:
                    # Same day count — could be an edit (activity changed)
                    # We'll mark edit_itinerary if the user's message suggests editing
                    inferred_tools.append("edit_itinerary")
                self._prev_itinerary_days = len(days)

            # Extract route cities — could be in routeProposal, top-level cities, or interrupt payload
            route_cities: list[str] = []
            if trip_state.get("routeProposal"):
                cities = trip_state["routeProposal"].get("cities", [])
                route_cities = [c.get("name", "") for c in cities]
            elif trip_state.get("cities"):
                route_cities = [c.get("name", "") for c in trip_state["cities"]]

            # Also check interrupt payload for route proposal
            if interrupt_payload and isinstance(interrupt_payload, dict):
                proposal = interrupt_payload.get("proposal", {})
                if proposal and not route_cities:
                    cities = proposal.get("cities", [])
                    route_cities = [c.get("name", "") for c in cities]

            if route_cities:
                result.route_cities = route_cities
                inferred_tools.append("propose_route")

        result.tool_calls = inferred_tools


async def get_auth_token(base_url: str) -> str:
    """Register a fresh test user and return the auth token."""
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as c:
        email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        r = await c.post(
            f"{base_url}/api/auth/register",
            json={"name": "Test Eval", "email": email, "password": "testpassword123"},
        )
        if r.status_code == 200:
            return r.json().get("token", "")
        raise Exception(f"Auth failed: {r.status_code} {r.text}")


async def run_case(case: TestCase, base_url: str, max_retries: int = 2) -> CaseResult:
    """Run a single test case and return results with assertions checked.

    If a turn gets a rate-limit error (detected via empty response + no trip_state),
    the entire case is retried after a backoff delay.
    """
    start_time = time.time()

    for attempt in range(max_retries + 1):
        result = CaseResult(
            case_id=case.id,
            category=case.category,
            description=case.description,
        )

        try:
            token = await get_auth_token(base_url)
            conv = Conversation(base_url, token)

            rate_limited = False

            for i, turn in enumerate(case.turns):
                turn_result = await conv.send(turn.user_message)
                result.turns.append(turn_result)

                if turn_result.error:
                    # Check if this looks like a rate limit error
                    err_lower = (turn_result.error or "").lower()
                    if ("429" in err_lower or "rate limit" in err_lower) and attempt < max_retries:
                        rate_limited = True
                        break
                    result.assertions.append({
                        "type": "no_error",
                        "passed": False,
                        "expected": "no error",
                        "actual": turn_result.error,
                        "message": f"Turn {i+1}: {turn_result.error}",
                    })
                    break

                # Detect rate limit from empty response + no trip_state + no interrupt
                # (agent returned an error message but didn't crash)
                if (not turn_result.response and not turn_result.trip_state
                        and not turn_result.interrupt and not turn_result.timeout
                        and attempt < max_retries):
                    rate_limited = True
                    break

                # Also detect if response contains rate limit language
                resp_lower = (turn_result.response or "").lower()
                if ("rate limit" in resp_lower or "try again" in resp_lower
                        or "too many requests" in resp_lower) and attempt < max_retries:
                    rate_limited = True
                    break

                if turn_result.timeout:
                    result.assertions.append({
                        "type": "no_timeout",
                        "passed": False,
                        "expected": "response within timeout",
                        "actual": "timeout",
                        "message": f"Turn {i+1}: timed out waiting for response",
                    })

                # Run assertions for this turn
                _check_turn_assertions(turn, turn_result, result, i + 1)

            if rate_limited:
                wait = 30 * (attempt + 1)  # 30s, 60s backoff
                print(f"  [{case.id}] Rate limited, retrying in {wait}s (attempt {attempt+1}/{max_retries})...")
                await asyncio.sleep(wait)
                continue

            # Not rate limited — return the result
            break

        except Exception as e:
            result.assertions.append({
                "type": "exception",
                "passed": False,
                "expected": "no exception",
                "actual": str(e),
                "message": f"Exception: {e}",
            })
            break

    result.duration_seconds = time.time() - start_time
    result.passed = all(a["passed"] for a in result.assertions)
    return result


def _check_turn_assertions(turn: Turn, turn_result: TurnResult, case_result: CaseResult, turn_num: int):
    """Check all assertions for a single turn and append to case_result.assertions."""

    def assert_check(name: str, passed: bool, expected: str, actual: str, message: str):
        case_result.assertions.append({
            "type": name,
            "passed": passed,
            "expected": expected,
            "actual": actual,
            "message": f"Turn {turn_num}: {message}",
        })

    # Check expected_slots_filled
    for slot in turn.expected_slots_filled:
        passed = slot in turn_result.slots_filled
        assert_check(
            f"slot_filled:{slot}",
            passed,
            f"{slot} should be filled",
            f"filled: {turn_result.slots_filled}",
            f"slot '{slot}' should be filled" if passed else f"slot '{slot}' NOT filled (filled: {turn_result.slots_filled})",
        )

    # Check expected_slots_not_filled
    for slot in turn.expected_slots_not_filled:
        passed = slot not in turn_result.slots_filled
        assert_check(
            f"slot_not_filled:{slot}",
            passed,
            f"{slot} should NOT be filled",
            f"filled: {turn_result.slots_filled}",
            f"slot '{slot}' correctly not filled" if passed else f"slot '{slot}' was filled (should NOT be)",
        )

    # Check expected_tools_called (at least these tools)
    for tool in turn.expected_tools_called:
        passed = tool in turn_result.tool_calls
        assert_check(
            f"tool_called:{tool}",
            passed,
            f"{tool} should be called",
            f"tools: {turn_result.tool_calls}",
            f"tool '{tool}' called" if passed else f"tool '{tool}' NOT called (tools: {turn_result.tool_calls})",
        )

    # Check expected_tools_not_called
    for tool in turn.expected_tools_not_called:
        passed = tool not in turn_result.tool_calls
        assert_check(
            f"tool_not_called:{tool}",
            passed,
            f"{tool} should NOT be called",
            f"tools: {turn_result.tool_calls}",
            f"tool '{tool}' correctly not called" if passed else f"tool '{tool}' was called (should NOT be)",
        )

    # Check interrupt
    if turn.expected_interrupt:
        passed = turn_result.interrupt is not None
        assert_check(
            "interrupt_triggered",
            passed,
            "interrupt should be triggered",
            f"interrupt: {turn_result.interrupt is not None}",
            "interrupt triggered" if passed else "interrupt NOT triggered",
        )
    else:
        # If we explicitly don't expect an interrupt (only check when turn has other assertions)
        if turn.expected_tools_called or turn.expected_slots_filled or turn.expected_itinerary_days is not None:
            passed = turn_result.interrupt is None
            assert_check(
                "no_interrupt",
                passed,
                "no interrupt expected",
                f"interrupt: {turn_result.interrupt is not None}",
                "no interrupt (correct)" if passed else "interrupt triggered unexpectedly",
            )

    # Check itinerary days
    if turn.expected_itinerary_days is not None:
        passed = turn_result.itinerary_days == turn.expected_itinerary_days
        assert_check(
            "itinerary_days",
            passed,
            f"{turn.expected_itinerary_days} days",
            f"{turn_result.itinerary_days} days",
            f"itinerary has {turn_result.itinerary_days} days" if passed else f"expected {turn.expected_itinerary_days} days, got {turn_result.itinerary_days}",
        )

    # Check route cities
    if turn.expected_route_cities is not None:
        actual_cities = [c.lower() for c in turn_result.route_cities]
        expected_cities = [c.lower() for c in turn.expected_route_cities]
        all_present = all(c in actual_cities for c in expected_cities)
        assert_check(
            "route_cities",
            all_present,
            f"cities: {turn.expected_route_cities}",
            f"cities: {turn_result.route_cities}",
            f"route cities match: {turn_result.route_cities}" if all_present else f"expected cities {turn.expected_route_cities}, got {turn_result.route_cities}",
        )

    # Check response contains (case-insensitive)
    for substring in turn.expected_response_contains:
        passed = substring.lower() in turn_result.response.lower()
        assert_check(
            f"response_contains:{substring}",
            passed,
            f"response contains '{substring}'",
            f"response: {turn_result.response[:100]}...",
            f"response contains '{substring}'" if passed else f"response does NOT contain '{substring}'",
        )

    # Check response NOT contains (case-insensitive)
    for substring in turn.expected_response_not_contains:
        passed = substring.lower() not in turn_result.response.lower()
        assert_check(
            f"response_not_contains:{substring}",
            passed,
            f"response should NOT contain '{substring}'",
            f"response: {turn_result.response[:100]}...",
            f"response correctly avoids '{substring}'" if passed else f"response contains '{substring}' (should NOT)",
        )


async def run_cases(
    cases: list[TestCase],
    base_url: str,
    concurrency: int = 5,
    progress_callback=None,
    stagger_delay: float = 5.0,
) -> list[CaseResult]:
    """Run multiple test cases with limited concurrency.

    Args:
        stagger_delay: Seconds to wait between starting each concurrent case.
            Helps avoid rate limit spikes when many cases start simultaneously.
    """
    semaphore = asyncio.Semaphore(concurrency)
    results: list[CaseResult] = []
    completed = 0

    async def run_one(case: TestCase, index: int) -> CaseResult:
        nonlocal completed
        # Stagger start times to avoid rate limit spikes
        if stagger_delay > 0 and index > 0:
            await asyncio.sleep(stagger_delay * (index % concurrency))
        async with semaphore:
            result = await run_case(case, base_url)
            completed += 1
            if progress_callback:
                await progress_callback(completed, len(cases), result)
            return result

    tasks = [run_one(c, i) for i, c in enumerate(cases)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Convert exceptions to error results
    final: list[CaseResult] = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            cr = CaseResult(
                case_id=cases[i].id,
                category=cases[i].category,
                description=cases[i].description,
            )
            cr.assertions.append({
                "type": "exception",
                "passed": False,
                "expected": "no exception",
                "actual": str(r),
                "message": f"Unhandled exception: {r}",
            })
            final.append(cr)
        else:
            final.append(r)

    return final
