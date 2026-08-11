"""Hotels routes — search via SerpApi."""

from fastapi import APIRouter, HTTPException, Query

from app.services.serpapi_provider import serpapi_provider

router = APIRouter()


@router.get("/search")
async def search_hotels(
    destination: str = Query(...),
    checkIn: str = Query(...),
    checkOut: str = Query(...),
    adults: int = 2,
    children: int = 0,
    minPrice: int | None = None,
    maxPrice: int | None = None,
    currency: str = "USD",
    sort: str = "relevance",
):
    hotels = await serpapi_provider.search_hotels(
        destination=destination,
        check_in=checkIn,
        check_out=checkOut,
        adults=adults,
        children=children,
        min_price=minPrice,
        max_price=maxPrice,
        currency=currency,
        sort=sort,
    )
    return {"success": True, "count": len(hotels), "hotels": hotels}
