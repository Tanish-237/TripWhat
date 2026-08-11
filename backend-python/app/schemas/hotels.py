"""Hotel schemas."""

from pydantic import BaseModel


class HotelQuery(BaseModel):
    destination: str
    checkIn: str
    checkOut: str
    adults: int = 2
    children: int = 0
    minPrice: int | None = None
    maxPrice: int | None = None
    currency: str = "USD"
    sort: str = "relevance"


class HotelOffer(BaseModel):
    id: str = ""
    name: str = ""
    type: str | None = None
    ratePerNight: float | None = None
    totalRate: float | None = None
    currency: str = "USD"
    rating: float | None = None
    reviewsCount: int | None = None
    amenities: list[str] = []
    bookingLink: str | None = None
    images: list[dict] = []
