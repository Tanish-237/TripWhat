"""Travel means schemas."""

from pydantic import BaseModel, Field


class TravelMeansRequest(BaseModel):
    startLocation: str
    cities: list[str]
    startDate: str
    totalDays: int
    passengers: int
    preferences: dict | None = None


class TravelRouteRequest(BaseModel):
    from_: str = Field(alias="from")
    to: str
    departureDate: str
    passengers: int
    preferences: dict | None = None

    model_config = {"populate_by_name": True}


class TravelResponse(BaseModel):
    success: bool
    data: dict | None = None
