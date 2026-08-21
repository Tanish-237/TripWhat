"""Calendar tools — create_calendar_event."""

from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig


@tool
async def create_calendar_event(
    summary: str,
    start: str,
    end: str,
    description: str | None = None,
    location: str | None = None,
    config: RunnableConfig = None,
) -> str:
    """Create a Google Calendar event for a trip activity.

    Args:
        summary: Event title
        start: Start datetime (ISO format)
        end: End datetime (ISO format)
        description: Optional event description
        location: Optional event location
    """
    user_id = (config.get("configurable") or {}).get("user_id") if config else None
    if not user_id:
        return "I couldn't determine your user account to create a calendar event. Please try again."

    from app.services.calendar_service import CalendarService

    service = CalendarService()
    try:
        event = await service.create_event(
            user_id=str(user_id),
            event_data={
                "summary": summary,
                "start": start,
                "end": end,
                "description": description,
                "location": location,
            },
        )
        if event:
            return f"Calendar event '{summary}' created successfully for {start}."
        return "I couldn't create the calendar event. Please make sure your Google Calendar is connected."
    except Exception as e:
        return f"I encountered an error creating the calendar event: {e}. Make sure your Google Calendar is connected."
