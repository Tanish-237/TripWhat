"""Flight schemas."""

from pydantic import BaseModel


class FlightQuery(BaseModel):
    origin: str
    destination: str
    departureDate: str
    returnDate: str | None = None
    adults: int = 1
    children: int = 0
    travelClass: str = "economy"
    maxPrice: int | None = None
    currency: str = "USD"
    deepSearch: bool = False


class FlightOffer(BaseModel):
    id: str = ""
    legs: list[dict] = []
    layovers: list[dict] = []
    totalDuration: int = 0
    price: float = 0
    currency: str = "USD"
    priceFormatted: str | None = None
    type: str = "one-way"
    bookingToken: str | None = None
    bookingLink: str | None = None
    carbonEmissions: dict | None = None
    isBest: bool = False


class AirportRef(BaseModel):
    code: str = ""
    name: str = ""
    city: str | None = None
    time: str | None = None
