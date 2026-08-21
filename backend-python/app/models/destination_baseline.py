"""DestinationBaseline ORM model."""

from datetime import datetime, timezone

from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, PortableJSON


class DestinationBaseline(Base):
    __tablename__ = "destination_baselines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    place_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    coordinates: Mapped[dict | None] = mapped_column(PortableJSON, nullable=True)
    popularity_score: Mapped[int] = mapped_column(Integer, default=0)
    top_attractions: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    top_restaurants: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    neighborhoods: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    route_templates: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    refreshed_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc).replace(tzinfo=None))
    ttl_days: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc).replace(tzinfo=None), onupdate=datetime.now(timezone.utc).replace(tzinfo=None))
