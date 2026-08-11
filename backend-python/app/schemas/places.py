"""Places schemas."""

from pydantic import BaseModel


class PlaceResult(BaseModel):
    id: str = ""
    name: str = ""
    location: str = ""
    country: str = ""
    state: str = ""
    description: str = ""
    type: str = ""
    coordinates: dict = {}
    imageUrl: str = ""
    searchTerms: list[str] = []
    rating: float = 0
    kinds: str = ""


class AutocompleteResult(BaseModel):
    id: str = ""
    name: str = ""
    location: str = ""
    country: str = ""
    state: str = ""
    description: str = ""
    type: str = ""
    coordinates: dict = {}
    searchTerms: list[str] = []
    population: int | None = None
