"""Calendar tools — create_calendar_event."""

from langchain_core.tools import tool


@tool
async def create_calendar_event(
    summary: str,
    start: str,
    end: str,
    description: str | None = None,
    location: str | None = None,
) -> str:
    """Create a Google Calendar event for a trip activity.

    Args:
        summary: Event title
        start: Start datetime (ISO format)
        end: End datetime (ISO format)
        description: Optional event description
        location: Optional event location
    """
    # This tool requires a user context — in the agent, we'd need to pass the user_id
    # For now, return a message indicating the event would be created
    return f"Calendar event '{summary}' would be created from {start} to {end}. Connect Google Calendar to enable this feature."
