"""Itinerary Pydantic schemas — replaces itinerary/types.ts."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


class ActivityLocation(BaseModel):
    name: str = ""
    address: str = ""
    coordinates: dict = Field(default_factory=lambda: {"lat": 0, "lng": 0})


class ActivityCost(BaseModel):
    amount: float = 0
    currency: str = "USD"
    category: str = ""


class Activity(BaseModel):
    id: str = Field(default_factory=_uuid)
    title: str = ""
    name: str | None = None
    type: str = ""
    location: ActivityLocation = Field(default_factory=ActivityLocation)
    duration: str = ""
    cost: ActivityCost | str = ""
    description: str | None = None
    rating: float | None = None
    imageUrl: str | None = None
    tags: list[str] = []
    xid: str | None = None
    openingHours: list[str] | None = None
    isOpen: bool | None = None
    websiteUrl: str | None = None
    phoneNumber: str | None = None
    distanceToNext: str | None = None
    mustVisit: bool | None = None
    bestTimeToVisit: str | None = None
    bookingRequired: bool | None = None
    placeId: str | None = None
    photos: list[str] | None = None
    address: str | None = None
    coordinates: dict | None = None
    metadata: dict | None = None
    travelInfo: dict | None = None


class TimeSlot(BaseModel):
    id: str = Field(default_factory=_uuid)
    period: str = "morning"
    startTime: str = "09:00"
    endTime: str = "12:00"
    activity: Activity = Field(default_factory=Activity)
    label: str | None = None
    time: str | None = None
    activities: list[Activity] = []


class DayPlan(BaseModel):
    id: str = Field(default_factory=_uuid)
    dayNumber: int = 1
    date: str = ""
    title: str = "Day 1"
    subtitle: str | None = None
    location: str = ""
    weather: dict | None = None
    timeSlots: list[TimeSlot] = []
    estimatedCost: float = 0
    highlights: list[str] = []
    tips: list[str] = []
    signature: str | None = None


class TripMetadata(BaseModel):
    destination: str = ""
    startDate: str | None = None
    endDate: str | None = None
    duration: int = 0
    budget: str | dict | None = None
    travelers: int | None = None
    preferences: list[str] | None = None
    travelType: str | None = None
    localTips: list[str] | None = None
    bestSeason: str | None = None
    startLocation: str | None = None
    travelMeans: dict | None = None


class Itinerary(BaseModel):
    id: str = Field(default_factory=_uuid)
    tripMetadata: TripMetadata = Field(default_factory=TripMetadata)
    days: list[DayPlan] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)


class ItineraryAction(BaseModel):
    type: str = "add"
    target: dict = {}
    details: dict | None = None


class EditorResult(BaseModel):
    itinerary: Itinerary
    message: str
    changeSummary: dict | None = None


class BuildContext(BaseModel):
    destination: str = ""
    duration: int = 0
    startDate: str | None = None
    preferences: list[str] | None = None
    travelType: str | None = None
    dailyBudget: float | None = None
    activityLevel: str | None = None
    pacing: str | None = None
    numberOfPeople: int | None = None
    startLocation: str | dict | None = None
    cities: list[dict] | None = None
    totalDays: int | None = None
    budget: dict | None = None
    budgetMode: str | None = None
    travelPreferences: dict | None = None


# --- Factory helpers ---

_TIME_MAP = {
    "morning": {"start": "09:00", "end": "12:00"},
    "afternoon": {"start": "14:00", "end": "18:00"},
    "evening": {"start": "19:00", "end": "22:00"},
}


def create_time_slot(period: str = "morning", activity: Activity | None = None) -> TimeSlot:
    times = _TIME_MAP.get(period, _TIME_MAP["morning"])
    return TimeSlot(
        period=period,
        startTime=times["start"],
        endTime=times["end"],
        activity=activity or Activity(),
        label=period.capitalize(),
        time=f"{times['start']}-{times['end']}",
        activities=[activity] if activity else [],
    )


def create_day_plan(day_number: int, date: str, location: str, title: str | None = None) -> DayPlan:
    return DayPlan(
        dayNumber=day_number,
        date=date,
        location=location,
        title=title or f"Day {day_number}",
        timeSlots=[create_time_slot("morning"), create_time_slot("afternoon"), create_time_slot("evening")],
    )


def create_itinerary(destination: str, duration: int, start_date: str | None = None) -> Itinerary:
    days = []
    for i in range(duration):
        if start_date:
            from datetime import datetime, timedelta
            d = (datetime.fromisoformat(start_date) + timedelta(days=i)).date().isoformat()
        else:
            d = ""
        days.append(create_day_plan(i + 1, d, destination))
    return Itinerary(
        tripMetadata=TripMetadata(destination=destination, duration=duration, startDate=start_date),
        days=days,
    )
