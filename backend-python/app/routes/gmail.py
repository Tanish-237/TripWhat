"""Gmail routes — OAuth URL, callback, booking search."""

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from app.config import settings
from app.deps import get_current_user
from app.models import User
from app.services.gmail_service import gmail_service

router = APIRouter()


@router.get("/gmail/oauth/url")
async def get_gmail_oauth_url(request: Request, user: User = Depends(get_current_user)):
    """Get Gmail OAuth URL for the user to authorize."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=400, detail="Missing bearer token")
    try:
        url = gmail_service.get_oauth_url(token)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gmail/oauth/callback")
async def gmail_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """Handle Gmail OAuth callback."""
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("userId")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid state token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid state token")

    await gmail_service.exchange_code_and_store_tokens(code, str(user_id))
    return RedirectResponse(
        url=f"{settings.frontend_url}/trips?gmail=connected",
        status_code=302,
    )


@router.get("/gmail/status")
async def gmail_status(user: User = Depends(get_current_user)):
    """Check if Gmail is connected."""
    connected = await gmail_service.is_connected(str(user.id))
    return {"connected": connected}


@router.get("/gmail/bookings")
async def get_gmail_bookings(user: User = Depends(get_current_user)):
    """Search Gmail for booking confirmations."""
    try:
        bookings = await gmail_service.search_bookings(str(user.id))
        return {"bookings": bookings, "count": len(bookings)}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
