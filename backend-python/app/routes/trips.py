"""Trips routes — full CRUD + statistics + upcoming/completed."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import Trip, User
from app.schemas.trip import CreateTripRequest, UpdateTripRequest, MarkUpcomingRequest

router = APIRouter()


def _trip_to_dict(trip: Trip) -> dict:
    return {
        "id": trip.id,
        "title": trip.title,
        "description": trip.description,
        "startDate": trip.start_date.isoformat() if trip.start_date else None,
        "startLocation": trip.start_location,
        "cities": trip.cities or [],
        "totalDays": trip.total_days,
        "people": trip.people,
        "travelType": trip.travel_type,
        "budget": trip.budget,
        "budgetMode": trip.budget_mode,
        "generatedItinerary": trip.generated_itinerary,
        "isPublic": trip.is_public,
        "tags": trip.tags or [],
        "isUpcoming": trip.is_upcoming,
        "isCompleted": trip.is_completed,
        "tripStartDate": trip.trip_start_date.isoformat() if trip.trip_start_date else None,
        "tripEndDate": trip.trip_end_date.isoformat() if trip.trip_end_date else None,
        "createdAt": trip.created_at.isoformat() if trip.created_at else None,
        "updatedAt": trip.updated_at.isoformat() if trip.updated_at else None,
    }


@router.post("")
@router.post("/")
async def create_trip(
    req: CreateTripRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = Trip(
        user_id=user.id,
        title=req.title,
        description=req.description,
        start_date=datetime.fromisoformat(req.startDate) if req.startDate else None,
        start_location=req.startLocation,
        cities=[c.model_dump() for c in req.cities],
        total_days=req.totalDays,
        people=req.people,
        travel_type=req.travelType,
        budget=req.budget.model_dump() if req.budget else None,
        budget_mode=req.budgetMode,
        generated_itinerary=req.generatedItinerary,
        is_public=req.isPublic,
        tags=req.tags,
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return {"message": "Trip saved successfully", "savedTrip": _trip_to_dict(trip)}


@router.get("")
@router.get("/")
async def list_trips(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Trip).where(
        Trip.user_id == user.id,
        Trip.is_upcoming != True,
        Trip.is_completed != True,
    )
    if search:
        query = query.where(
            or_(
                Trip.title.ilike(f"%{search}%"),
                Trip.description.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(Trip.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    trips = result.scalars().all()

    count_q = select(func.count(Trip.id)).where(
        Trip.user_id == user.id,
        Trip.is_upcoming != True,
        Trip.is_completed != True,
    )
    total = (await db.execute(count_q)).scalar() or 0

    return {
        "savedTrips": [_trip_to_dict(t) for t in trips],
        "pagination": {
            "current": page,
            "pages": (total + limit - 1) // limit,
            "total": total,
        },
    }


@router.get("/upcoming")
async def list_upcoming(
    page: int = 1,
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Trip).where(
        Trip.user_id == user.id,
        Trip.is_upcoming == True,
        Trip.is_completed != True,
    ).order_by(Trip.trip_start_date.asc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    trips = result.scalars().all()

    count_q = select(func.count(Trip.id)).where(
        Trip.user_id == user.id,
        Trip.is_upcoming == True,
        Trip.is_completed != True,
    )
    total = (await db.execute(count_q)).scalar() or 0

    return {
        "upcomingTrips": [_trip_to_dict(t) for t in trips],
        "pagination": {"current": page, "pages": (total + limit - 1) // limit, "total": total},
    }


@router.get("/completed")
async def list_completed(
    page: int = 1,
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Trip).where(
        Trip.user_id == user.id,
        Trip.is_completed == True,
    ).order_by(Trip.trip_end_date.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    trips = result.scalars().all()

    count_q = select(func.count(Trip.id)).where(
        Trip.user_id == user.id,
        Trip.is_completed == True,
    )
    total = (await db.execute(count_q)).scalar() or 0

    return {
        "completedTrips": [_trip_to_dict(t) for t in trips],
        "pagination": {"current": page, "pages": (total + limit - 1) // limit, "total": total},
    }


@router.get("/statistics")
async def get_statistics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.user_id == user.id))
    all_trips = result.scalars().all()

    saved = [t for t in all_trips if not t.is_upcoming and not t.is_completed]
    upcoming = [t for t in all_trips if t.is_upcoming and not t.is_completed]
    completed = [t for t in all_trips if t.is_completed]

    cities_visited = set()
    countries_visited = set()
    for t in completed:
        for c in (t.cities or []):
            if isinstance(c, dict):
                cities_visited.add(c.get("name", ""))
                parts = c.get("name", "").split(",")
                if len(parts) > 1:
                    countries_visited.add(parts[-1].strip())

    total_days = sum(t.total_days or 0 for t in completed)
    total_activities = 0
    for t in all_trips:
        days = (t.generated_itinerary or {}).get("days", [])
        for day in days:
            for slot in day.get("timeSlots", []):
                total_activities += len(slot.get("activities", []))

    recent = sorted(completed, key=lambda t: t.trip_end_date or datetime.min, reverse=True)
    next_trip = sorted(upcoming, key=lambda t: t.trip_start_date or datetime.max)

    def _brief(t):
        return {"id": t.id, "title": t.title, "cities": t.cities or []}

    return {
        "statistics": {
            "totalTrips": len(all_trips),
            "savedTrips": len(saved),
            "upcomingTrips": len(upcoming),
            "completedTrips": len(completed),
            "totalDaysTraveled": total_days,
            "citiesVisited": len(cities_visited),
            "countriesVisited": len(countries_visited),
            "totalActivities": total_activities,
            "recentTrip": {**_brief(recent[0]), "endDate": recent[0].trip_end_date.isoformat() if recent[0].trip_end_date else None} if recent else None,
            "nextTrip": {**_brief(next_trip[0]), "startDate": next_trip[0].trip_start_date.isoformat() if next_trip[0].trip_start_date else None} if next_trip else None,
        }
    }


@router.get("/check")
async def check_trip(
    startDate: str = Query(...),
    cities: str = Query(...),
    people: int = Query(...),
    travelType: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json
    city_names = [c["name"] for c in json.loads(cities)]
    result = await db.execute(
        select(Trip).where(
            Trip.user_id == user.id,
            Trip.start_date == datetime.fromisoformat(startDate),
            Trip.people == people,
            Trip.travel_type == travelType,
        )
    )
    trips = result.scalars().all()
    for trip in trips:
        trip_city_names = [c.get("name") for c in (trip.cities or [])]
        if any(cn in trip_city_names for cn in city_names):
            return {"isSaved": True, "savedTrip": _trip_to_dict(trip)}
    return {"isSaved": False, "savedTrip": None}


@router.get("/{trip_id}")
async def get_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Saved trip not found")
    return _trip_to_dict(trip)


@router.put("/{trip_id}")
async def update_trip(
    trip_id: int,
    req: UpdateTripRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Saved trip not found")

    data = req.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key == "startDate" and value:
            trip.start_date = datetime.fromisoformat(value)
        elif key == "cities" and value:
            trip.cities = value
        elif key == "budget" and value:
            trip.budget = value
        elif hasattr(trip, key):
            setattr(trip, key, value)

    await db.commit()
    await db.refresh(trip)
    return {"message": "Trip updated successfully", "savedTrip": _trip_to_dict(trip)}


@router.put("/{trip_id}/upcoming")
async def mark_upcoming(
    trip_id: int,
    req: MarkUpcomingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Saved trip not found")

    start = datetime.fromisoformat(req.tripStartDate)
    end = start + timedelta(days=trip.total_days or 1)
    trip.is_upcoming = True
    trip.is_completed = False
    trip.trip_start_date = start.date()
    trip.trip_end_date = end.date()
    await db.commit()
    await db.refresh(trip)
    return {"message": "Trip marked as upcoming successfully", "savedTrip": _trip_to_dict(trip)}


@router.put("/{trip_id}/completed")
async def mark_completed(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Saved trip not found")
    trip.is_completed = True
    trip.trip_end_date = datetime.utcnow().date()
    await db.commit()
    await db.refresh(trip)
    return {"message": "Trip marked as completed successfully", "savedTrip": _trip_to_dict(trip)}


@router.delete("/{trip_id}/upcoming")
async def remove_upcoming(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Saved trip not found")
    trip.is_upcoming = False
    trip.is_completed = False
    trip.trip_start_date = None
    trip.trip_end_date = None
    await db.commit()
    await db.refresh(trip)
    return {"message": "Trip moved back to saved successfully", "savedTrip": _trip_to_dict(trip)}


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Saved trip not found")
    await db.delete(trip)
    await db.commit()
    return {"message": "Trip deleted successfully"}
