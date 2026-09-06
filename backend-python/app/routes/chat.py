"""Chat routes — conversation management + agent chat."""

import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db, async_session
from app.deps import get_current_user
from app.models import Conversation, User
from app.schemas.chat import SendMessageRequest
from app.services.memory import get_user_memories
from app.services.stream_buffer import stream_buffer
from app.utils.logger import logger

router = APIRouter()

# Cap persisted conversation history to keep the JSONB column bounded
MAX_CONVERSATION_MESSAGES = 100


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

    messages = list(conversation.messages or [])
    messages.append({
        "role": "user",
        "content": req.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    conversation.messages = messages[-MAX_CONVERSATION_MESSAGES:]
    flag_modified(conversation, "messages")

    await db.commit()

    # Build history
    history = [f"{m['role']}: {m['content']}" for m in messages[-8:]]

    # Load long-term user memories (LangGraph store) for personalization
    memories = await get_user_memories(user.id)

    # Inject home city (from preferences or memories) so the agent can
    # auto-fill the origin when flights are in scope.
    prefs = user.preferences or {}
    home_city = prefs.get("homeCity") or prefs.get("home_city")
    if not home_city:
        for m in memories:
            ml = (m or "").lower()
            if "home_city" in ml or "home city" in ml or "home airport" in ml:
                parts = m.split(":", 1)
                if len(parts) == 2:
                    home_city = parts[1].strip()
                    break

    agent_context = {
        "tripState": conversation.trip_state,
        "history": history,
        "userId": user.id,
        "userPreferences": user.preferences or {},
        "userMemories": memories,
        "homeCity": home_city,
    }

    logger.info(f"Processing (streaming): {req.message!r}")

    # Mark stream as active and launch background task
    await stream_buffer.mark_active(conv_id)
    asyncio.create_task(_process_agent_stream(
        conv_id, req.message, agent_context, user.id
    ))

    return {
        "conversationId": conv_id,
        "status": "streaming",
    }


async def _process_agent_stream(
    conv_id: str,
    message: str,
    agent_context: dict,
    user_id: str,
):
    """Background task: stream agent events and relay via Socket.IO.

    Handles token streaming, status updates, widget events, tripState changes,
    and final DB persistence.
    """
    from app.agents.travel_agent import travel_agent
    from app.main import sio

    try:
        async for event in travel_agent.chat_stream(message, conv_id, agent_context):
            if event["type"] == "token":
                eid = await stream_buffer.push_event(conv_id, "token", {"text": event["text"]})
                await sio.emit("agent:token", {
                    "conversationId": conv_id,
                    "text": event["text"],
                    "eventId": eid,
                }, room=conv_id)

            elif event["type"] == "status":
                eid = await stream_buffer.push_event(conv_id, "status", {"status": event["status"]})
                await sio.emit("agent:status", {
                    "conversationId": conv_id,
                    "status": event["status"],
                    "eventId": eid,
                }, room=conv_id)

            elif event["type"] == "tool_start":
                payload = {
                    "conversationId": conv_id,
                    "toolName": event.get("tool_name", ""),
                    "label": event.get("label", ""),
                    "callId": event.get("call_id", ""),
                    "input": event.get("input"),
                }
                eid = await stream_buffer.push_event(conv_id, "tool_start", payload)
                payload["eventId"] = eid
                await sio.emit("agent:tool_start", payload, room=conv_id)

            elif event["type"] == "tool_end":
                payload = {
                    "conversationId": conv_id,
                    "toolName": event.get("tool_name", ""),
                    "label": event.get("label", ""),
                    "callId": event.get("call_id", ""),
                    "summary": event.get("summary", ""),
                    "error": event.get("error"),
                }
                eid = await stream_buffer.push_event(conv_id, "tool_end", payload)
                payload["eventId"] = eid
                await sio.emit("agent:tool_end", payload, room=conv_id)

            elif event["type"] == "itinerary_day":
                payload = {
                    "conversationId": conv_id,
                    "day": event.get("day"),
                    "city": event.get("city"),
                    "timeSlots": event.get("timeSlots"),
                    "totalDays": event.get("totalDays"),
                }
                eid = await stream_buffer.push_event(conv_id, "itinerary_day", payload)
                payload["eventId"] = eid
                await sio.emit("agent:itinerary_day", payload, room=conv_id)

            elif event["type"] == "widget":
                eid = await stream_buffer.push_event(conv_id, "widget", {"widget": event["widget"]})
                await sio.emit("agent:widget", {
                    "conversationId": conv_id,
                    "widget": event["widget"],
                    "eventId": eid,
                }, room=conv_id)

            elif event["type"] == "tripState":
                sanitized = _sanitize_json(event["tripState"])
                eid = await stream_buffer.push_event(conv_id, "tripState", {"tripState": sanitized})
                await sio.emit("agent:tripState", {
                    "conversationId": conv_id,
                    "tripState": sanitized,
                    "eventId": eid,
                }, room=conv_id)

            elif event["type"] == "complete":
                payload = event["payload"]
                ai_response = payload.get("response", "I apologize, but I had trouble processing your request.")

                # Persist to DB
                async with async_session() as db:
                    result = await db.execute(
                        select(Conversation).where(Conversation.conversation_id == conv_id)
                    )
                    conversation = result.scalar_one_or_none()
                    if conversation:
                        msgs = list(conversation.messages or [])
                        msgs.append({
                            "role": "assistant",
                            "content": ai_response,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                        conversation.messages = msgs[-MAX_CONVERSATION_MESSAGES:]
                        flag_modified(conversation, "messages")

                        if payload.get("tripState"):
                            conversation.trip_state = _sanitize_json(payload["tripState"])
                            flag_modified(conversation, "trip_state")
                            logger.info("Saved tripState to conversation")

                        await db.commit()

                # Emit final response
                final_payload = {
                    "message": ai_response,
                    "conversationId": conv_id,
                    "widgets": payload.get("widgets", []),
                    "suggestions": payload.get("suggestions", []),
                    "changeSummary": payload.get("changeSummary", []),
                    "classification": payload.get("classification"),
                    "tripState": _sanitize_json(payload.get("tripState")),
                }
                eid = await stream_buffer.push_event(conv_id, "response", final_payload)
                final_payload["eventId"] = eid
                await sio.emit("agent:response", final_payload, room=conv_id)

    except Exception as e:
        logger.error(f"[STREAM_TASK] Failed: {e}", exc_info=True)
        error_payload = {
            "message": "I'm sorry, I encountered an error processing your request.",
            "conversationId": conv_id,
            "widgets": [],
            "suggestions": [],
            "changeSummary": [],
            "classification": None,
            "tripState": None,
            "error": str(e),
        }
        eid = await stream_buffer.push_event(conv_id, "response", error_payload)
        error_payload["eventId"] = eid
        await sio.emit("agent:response", error_payload, room=conv_id)

    finally:
        await stream_buffer.mark_done(conv_id)


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


@router.get("/stream/{conversation_id}")
async def get_stream_events(
    conversation_id: str,
    after: str = "0",
    user: User = Depends(get_current_user),
):
    """Replay buffered stream events for a conversation.

    Used by the frontend on reconnect to catch up on missed events.
    `after` is the last seen Redis stream entry ID (default "0" = all).
    """
    events = await stream_buffer.read_events(conversation_id, after_id=after)
    is_active = await stream_buffer.is_active(conversation_id)
    last_id = events[-1]["id"] if events else after
    return {
        "conversationId": conversation_id,
        "events": events,
        "isActive": is_active,
        "lastEventId": last_id,
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
    await stream_buffer.clear_stream(conversation_id)
    return {"message": "Conversation deleted successfully"}
