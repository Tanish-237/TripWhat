"""Calendar routes — Google OAuth + event management."""

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from app.config import settings
from app.deps import get_current_user
from app.models import User
from app.services.calendar_service import calendar_service

router = APIRouter()


@router.get("/oauth/url")
async def get_oauth_url(request: Request, user: User = Depends(get_current_user)):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=400, detail="Missing bearer token")
    url = calendar_service.get_oauth_url(token)
    return {"url": url}


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid state token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid state token")

    await calendar_service.exchange_code_and_store_tokens(code, str(user_id))
    return RedirectResponse(
        url=f"{settings.frontend_url}/trips?gcal=connected",
        status_code=302,
    )


@router.get("/calendar/upcoming")
async def upcoming_events(user: User = Depends(get_current_user)):
    try:
        events = await calendar_service.list_upcoming_events(str(user.id))
        return {"events": events}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/calendar/events")
async def create_event(
    payload: dict,
    user: User = Depends(get_current_user),
):
    required = ["summary", "start", "end"]
    for field in required:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"{field} is required")
    try:
        event = await calendar_service.create_event(str(user.id), payload)
        return {"event": event}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
