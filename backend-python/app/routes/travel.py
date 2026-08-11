"""Travel routes — travel means calculation."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.deps import get_current_user
from app.models import User
from app.services.travel_means import travel_means_service

router = APIRouter()


class MeansRequest(BaseModel):
    startLocation: str
    cities: list[str]
    startDate: str
    totalDays: int
    passengers: int
    preferences: dict | None = None


class RouteRequest(BaseModel):
    from_: str
    to: str
    departureDate: str
    passengers: int
    preferences: dict | None = None

    model_config = {"populate_by_name": True}


@router.post("/means")
async def calculate_means(
    req: MeansRequest,
    user: User = Depends(get_current_user),
):
    from datetime import datetime
    result = await travel_means_service.calculate_travel_means(
        start_location=req.startLocation,
        cities=req.cities,
        start_date=datetime.fromisoformat(req.startDate),
        total_days=req.totalDays,
        passengers=req.passengers,
        preferences=req.preferences,
    )
    return {"success": True, "data": result}


@router.post("/route")
async def get_route(
    req: RouteRequest,
    user: User = Depends(get_current_user),
):
    from datetime import datetime
    route = await travel_means_service.get_travel_means_for_route(
        from_location=req.from_,
        to=req.to,
        departure_date=datetime.fromisoformat(req.departureDate),
        passengers=req.passengers,
        preferences=req.preferences,
    )
    return {"success": True, "data": route}


@router.post("/recommendations")
async def recommendations(
    routes: list[dict],
    user: User = Depends(get_current_user),
):
    recommendations = [
        {
            "type": "COST_EFFECTIVE",
            "routeIndices": [0, 1],
            "description": "Most budget-friendly options",
            "estimatedSavings": 150,
        }
    ]
    return {"success": True, "data": {"recommendations": recommendations}}
