"""ORM models package — import all models so SQLAlchemy registers them."""

from app.models.user import User
from app.models.conversation import Conversation
from app.models.trip import Trip
from app.models.destination_baseline import DestinationBaseline
from app.models.flight_cache import FlightCache
from app.models.places_cache import PlacesCache, SearchCache
from app.models.saved_item import SavedItem
from app.models.image_cache import ImageCache

__all__ = ["User", "Conversation", "Trip", "DestinationBaseline", "FlightCache", "PlacesCache", "SearchCache", "SavedItem", "ImageCache"]
