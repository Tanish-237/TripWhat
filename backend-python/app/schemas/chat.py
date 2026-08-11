"""Chat request/response schemas."""

from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    message: str
    conversationId: str | None = None
    currentItinerary: dict | None = None


class ChatResponse(BaseModel):
    conversationId: str
    message: str
    widgets: list = []
    suggestions: list = []
    changeSummary: list = []
    classification: dict | None = None
    tripState: dict | None = None
    timestamp: str


class SyncItineraryRequest(BaseModel):
    conversationId: str
    itinerary: dict


class ModifyItineraryRequest(BaseModel):
    message: str
    conversationId: str


class ConversationResponse(BaseModel):
    conversationId: str
    messages: list = []
    metadata: dict | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
