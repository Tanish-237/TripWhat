"""FlightCache ORM model."""

from datetime import datetime, timezone

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, PortableJSON


class FlightCache(Base):
    __tablename__ = "flight_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    search_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    origin: Mapped[str] = mapped_column(String(10))
    destination: Mapped[str] = mapped_column(String(10))
    departure_date: Mapped[str] = mapped_column(String(10))
    flight_data: Mapped[dict] = mapped_column(PortableJSON)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc).replace(tzinfo=None))
    expires_at: Mapped[datetime] = mapped_column(index=True)
