"""Chat request/response schemas."""

from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    message: str
    conversationId: str | None = None
    currentItinerary: dict | None = None
