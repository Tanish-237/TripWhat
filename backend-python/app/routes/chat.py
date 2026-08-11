"""Chat routes — conversation management + agent chat."""

import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import Conversation, User
from app.schemas.chat import SendMessageRequest, SyncItineraryRequest, ModifyItineraryRequest
from app.utils.logger import logger

router = APIRouter()


def _sanitize_json(obj):
    """Recursively convert non-JSON-serializable values (datetime, etc.) to strings."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_json(v) for v in obj]
    return obj


@router.post("/conversation")
async def create_conversation():
    return {"conversationId": str(uuid.uuid4())}


@router.post("")
@router.post("/")
@router.post("/message")
async def send_message(
    req: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.message:
        raise HTTPException(status_code=400, detail="Message is required")

    conv_id = req.conversationId or str(uuid.uuid4())

    result = await db.execute(select(Conversation).where(Conversation.conversation_id == conv_id))
    conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(
            conversation_id=conv_id,
            user_id=user.id,
            messages=[],
            meta={"userPreferences": user.preferences or {}},
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    messages = conversation.messages or []
    messages.append({
        "role": "user",
        "content": req.message,
        "timestamp": datetime.utcnow().isoformat(),
    })
    conversation.messages = messages

    if req.currentItinerary and not conversation.itinerary:
        conversation.itinerary = req.currentItinerary

    await db.commit()

    # Build history
    history = [f"{m['role']}: {m['content']}" for m in messages[-8:]]

    agent_context = {
        "tripState": conversation.trip_state,
        "history": history,
    }

    logger.info(f"Processing: {req.message!r}")

    # Invoke the travel agent
    from app.agents.travel_agent import travel_agent
    agent_result = await travel_agent.chat(
        message=req.message,
        conversation_id=conv_id,
        context=agent_context,
    )

    ai_response = agent_result.get("response", "I apologize, but I had trouble processing your request.")

    messages.append({
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.utcnow().isoformat(),
    })
    conversation.messages = messages

    if agent_result.get("itinerary"):
        conversation.itinerary = _sanitize_json(agent_result["itinerary"])
        logger.info("Saved itinerary to conversation")

    if agent_result.get("tripState"):
        conversation.trip_state = _sanitize_json(agent_result["tripState"])
        logger.info("Saved tripState to conversation")

    await db.commit()

    from app.main import sio
    await sio.emit("agent:response", {
        "message": ai_response,
        "conversationId": conv_id,
        "widgets": agent_result.get("widgets", []),
        "suggestions": agent_result.get("suggestions", []),
        "changeSummary": agent_result.get("changeSummary", []),
        "classification": agent_result.get("classification"),
        "tripState": _sanitize_json(agent_result.get("tripState")),
    })

    return {
        "conversationId": conv_id,
        "message": ai_response,
        "widgets": agent_result.get("widgets", []),
        "suggestions": agent_result.get("suggestions", []),
        "changeSummary": agent_result.get("changeSummary", []),
        "classification": agent_result.get("classification"),
        "tripState": _sanitize_json(agent_result.get("tripState")),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/sync-itinerary")
async def sync_itinerary(
    req: SyncItineraryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.conversationId or not req.itinerary:
        raise HTTPException(status_code=400, detail="ConversationId and itinerary are required")

    result = await db.execute(select(Conversation).where(Conversation.conversation_id == req.conversationId))
    conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(
            conversation_id=req.conversationId,
            user_id=user.id,
            messages=[],
            meta={},
        )
        db.add(conversation)

    conversation.itinerary = req.itinerary
    await db.commit()

    return {"success": True, "message": "Itinerary synced successfully", "conversationId": req.conversationId}


@router.post("/modify-itinerary")
async def modify_itinerary(
    req: ModifyItineraryRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not req.message or not req.conversationId:
        raise HTTPException(status_code=400, detail="Message and conversationId are required")

    result = await db.execute(select(Conversation).where(Conversation.conversation_id == req.conversationId))
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conversation.itinerary:
        raise HTTPException(status_code=400, detail="No itinerary found. Please create an itinerary first.")

    from app.services.itinerary_editor import itinerary_editor
    from app.services.slot_parser import slot_parser

    # Use the agent to handle modification via edit_itinerary tool
    from app.agents.travel_agent import travel_agent
    agent_result = await travel_agent.chat(
        message=req.message,
        conversation_id=req.conversationId,
        context={
            "tripState": conversation.trip_state,
            "history": [f"{m['role']}: {m['content']}" for m in (conversation.messages or [])[-8:]],
        },
    )

    if agent_result.get("itinerary"):
        conversation.itinerary = _sanitize_json(agent_result["itinerary"])
        await db.commit()

        from app.main import sio
        await sio.emit("trip:updated", {
            "conversationId": req.conversationId,
            "trip": agent_result["itinerary"],
            "changeSummary": agent_result.get("changeSummary", []),
        })

    return {
        "success": True,
        "message": agent_result.get("response", ""),
        "itinerary": agent_result.get("itinerary"),
    }


@router.get("/history/{conversation_id}")
@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.conversation_id == conversation_id))
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversationId": conversation.conversation_id,
        "messages": conversation.messages or [],
        "metadata": conversation.meta,
        "createdAt": conversation.created_at.isoformat() if conversation.created_at else None,
        "updatedAt": conversation.updated_at.isoformat() if conversation.updated_at else None,
    }


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.conversation_id == conversation_id))
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conversation)
    await db.commit()
    return {"message": "Conversation deleted successfully"}
