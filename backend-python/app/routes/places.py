"""Places routes — search and autocomplete."""

from fastapi import APIRouter, HTTPException, Query

from app.services.places_service import places_service

router = APIRouter()


@router.get("/search")
async def search_places(query: str = Query(...), limit: int = 10):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter is required")
    places = await places_service.search_places(query.strip(), limit)
    return places


@router.get("/autocomplete")
async def autocomplete(query: str = Query(...), limit: int = 8):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query parameter is required")
    suggestions = await places_service.get_autocomplete(query.strip(), limit)
    return suggestions
