"""Agent state schema — extends AgentState with trip_state for travel planning.

This lets tools read/write trip_state via InjectedState natively, instead of
injecting it as a system message context string. Tools can return
Command(update={"trip_state": new_state}) to persist state changes to the
graph state.
"""

from typing import Annotated, Any

from langchain.agents import AgentState


def merge_trip_state(left: dict[str, Any] | None, right: dict[str, Any] | None) -> dict[str, Any]:
    """Reducer for trip_state — shallow-merges right into left.

    This allows multiple tools in a single turn to each return
    Command(update={"trip_state": partial_state}) and have their updates
    merged together, rather than conflicting on a last-value channel.
    """
    if left is None and right is None:
        return {}
    if left is None:
        return right or {}
    if right is None:
        return left
    result = dict(left)
    for k, v in right.items():
        result[k] = v
    return result


class TravelAgentState(AgentState):
    """Agent state with trip_state for travel planning.

    Extends the base AgentState (which has messages, jump_to, structured_response)
    with a trip_state field that holds the TripState dict from state.py.

    Tools read trip_state via InjectedState and write it back via
    Command(update={"trip_state": new_state}). The merge reducer allows
    multiple tools to update trip_state in a single turn.
    """

    trip_state: Annotated[dict[str, Any], merge_trip_state]
