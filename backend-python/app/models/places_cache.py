"""Places cache ORM models — stores real place data from MCP/API searches."""

from datetime import datetime, timedelta

from sqlalchemy import String, Integer, Float, DateTime, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, PortableJSON


class PlacesCache(Base):
    __tablename__ = "places_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    place_id: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String(200), index=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    types: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    opening_hours: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    search_query: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    access_count: Mapped[int] = mapped_column(Integer, default=1)
    last_accessed: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cached_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class SearchCache(Base):
    __tablename__ = "search_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    query: Mapped[str] = mapped_column(Text, unique=True, index=True)
    city: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    result_count: Mapped[int] = mapped_column(Integer, default=0)
    place_ids: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    cached_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True, default=lambda: datetime.utcnow() + timedelta(days=30))
