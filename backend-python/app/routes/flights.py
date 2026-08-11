"""Flights routes — search, best, autocomplete via SerpApi."""

from fastapi import APIRouter, HTTPException, Query

from app.services.serpapi_provider import serpapi_provider

router = APIRouter()


@router.get("/search")
async def search_flights(
    origin: str = Query(...),
    destination: str = Query(...),
    departureDate: str = Query(...),
    returnDate: str | None = None,
    adults: int = 1,
    children: int = 0,
    travelClass: str = "economy",
    maxPrice: int | None = None,
    currency: str = "USD",
    deepSearch: bool = False,
):
    flights = await serpapi_provider.search_flights(
        origin=origin,
        destination=destination,
        departure_date=departureDate,
        return_date=returnDate,
        adults=adults,
        children=children,
        travel_class=travelClass,
        max_price=maxPrice,
        currency=currency,
        deep_search=deepSearch,
    )
    return {"success": True, "count": len(flights), "flights": flights}


@router.get("/best")
async def best_flight(
    origin: str = Query(...),
    destination: str = Query(...),
    departureDate: str = Query(...),
    returnDate: str | None = None,
    adults: int = 1,
    children: int = 0,
    travelClass: str = "economy",
    currency: str = "USD",
):
    flights = await serpapi_provider.search_flights(
        origin=origin,
        destination=destination,
        departure_date=departureDate,
        return_date=returnDate,
        adults=adults,
        children=children,
        travel_class=travelClass,
        currency=currency,
    )
    best = next((f for f in flights if f.get("isBest")), flights[0] if flights else None)
    if not best:
        raise HTTPException(status_code=404, detail="No flights found")
    return {"success": True, "flight": best}


@router.get("/autocomplete")
async def autocomplete(term: str = Query(...)):
    suggestions = await serpapi_provider.autocomplete(term)
    return {"success": True, "suggestions": suggestions}
