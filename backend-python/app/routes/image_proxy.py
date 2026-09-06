"""Image proxy route — caches image blobs in DB for stable, fast serving."""

import hashlib
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Query, Response, HTTPException
from sqlalchemy import delete, select, update

from app.database import async_session
from app.models.image_cache import ImageCache
from app.utils.logger import logger

router = APIRouter()

# Cap TTL cleanup to run at most once per minute
_last_cleanup: datetime | None = None
CLEANUP_INTERVAL = timedelta(seconds=60)
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


async def _cleanup_expired():
    """Delete image_cache rows older than TTL. Runs at most once per minute."""
    global _last_cleanup
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if _last_cleanup and (now - _last_cleanup) < CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    cutoff = now - ImageCache.ttl()
    try:
        async with async_session() as db:
            await db.execute(delete(ImageCache).where(ImageCache.last_accessed < cutoff))
            await db.commit()
    except Exception as e:
        logger.warning(f"[IMAGE_PROXY] TTL cleanup failed: {e}")


@router.get("/api/image")
async def proxy_image(url: str = Query(..., description="Full image URL to proxy and cache")):
    """Serve an image from DB cache, or fetch+cache on miss.

    Returns the raw image bytes with immutable Cache-Control headers so
    browsers and CDNs cache it indefinitely. The DB cache uses TTL-based
    eviction (7 days since last access).
    """
    if not url or not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid url parameter")

    url_hash = hashlib.sha256(url.encode()).hexdigest()[:32]

    # Kick off TTL cleanup (no-op if ran recently)
    await _cleanup_expired()

    # Check DB cache
    async with async_session() as db:
        row = (await db.execute(
            select(ImageCache).where(ImageCache.url_hash == url_hash)
        )).scalar_one_or_none()

        if row:
            # Update last_accessed
            await db.execute(
                update(ImageCache)
                .where(ImageCache.id == row.id)
                .values(last_accessed=datetime.now(timezone.utc).replace(tzinfo=None))
            )
            await db.commit()
            return Response(
                content=row.blob,
                media_type=row.content_type,
                headers={"Cache-Control": "public, max-age=31536000, immutable"},
            )

    # Cache miss — fetch from origin
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Origin returned {resp.status_code}")

            blob = resp.content
            if len(blob) > MAX_IMAGE_SIZE:
                # Too big to cache — serve directly without storing
                return Response(
                    content=blob,
                    media_type=resp.headers.get("content-type", "image/jpeg"),
                    headers={"Cache-Control": "public, max-age=31536000, immutable"},
                )

            content_type = resp.headers.get("content-type", "image/jpeg")

            # Store in DB
            async with async_session() as db:
                db.add(ImageCache(
                    url_hash=url_hash,
                    blob=blob,
                    content_type=content_type,
                    size_bytes=len(blob),
                ))
                await db.commit()

            return Response(
                content=blob,
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=31536000, immutable"},
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Origin timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"[IMAGE_PROXY] Fetch failed for {url[:80]}: {e}")
        raise HTTPException(status_code=502, detail="Image fetch failed")
