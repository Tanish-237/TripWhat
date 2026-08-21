"""SavedItem ORM model — items saved by the user (hotels, flights, places, restaurants)."""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, PortableJSON


class SavedItem(Base):
    __tablename__ = "saved_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    trip_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    item_type: Mapped[str] = mapped_column(String(50))  # hotel | flight | place | restaurant
    name: Mapped[str] = mapped_column(String(500))
    data: Mapped[dict | None] = mapped_column(PortableJSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc).replace(tzinfo=None))
