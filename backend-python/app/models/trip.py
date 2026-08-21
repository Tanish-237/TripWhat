"""Trip ORM model."""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, PortableJSON


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    start_location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    cities: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    total_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    people: Mapped[int | None] = mapped_column(Integer, nullable=True)
    travel_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget: Mapped[dict | None] = mapped_column(PortableJSON, nullable=True)
    budget_mode: Mapped[str | None] = mapped_column(String(20), nullable=True, default="capped")
    generated_itinerary: Mapped[dict | None] = mapped_column(PortableJSON, nullable=True)
    trip_state: Mapped[dict | None] = mapped_column(PortableJSON, nullable=True)
    chat_history: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    conversation_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list | None] = mapped_column(PortableJSON, nullable=True, default=list)
    is_upcoming: Mapped[bool] = mapped_column(Boolean, default=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    trip_start_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    trip_end_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
