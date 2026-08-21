"""Chat routes — conversation management + agent chat."""

import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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

    messages = conversation.messages or []
    messages.append({
        "role": "user",
        "content": req.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    conversation.messages = messages[-MAX_CONVERSATION_MESSAGES:]

    await db.commit()

    # Build history
    history = [f"{m['role']}: {m['content']}" for m in messages[-8:]]

    # Load long-term user memories (LangGraph store) for personalization
    memories = await get_user_memories(user.id)

    # Inject home city (from preferences or memories) so the agent can
    # auto-fill the origin slot when flights are in scope.
    prefs = user.preferences or {}
    home_city = prefs.get("homeCity") or prefs.get("home_city")
    if not home_city:
        # Check memories for a home_city entry.
        for m in memories:
            ml = (m or "").lower()
            if "home_city" in ml or "home city" in ml or "home airport" in ml:
                # Memory format: "home_city: Kolkata" or similar.
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

    Handles token streaming, status updates, tripState changes, interrupts,
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

            elif event["type"] == "tripState":
                sanitized = _sanitize_json(event["tripState"])
                eid = await stream_buffer.push_event(conv_id, "tripState", {"tripState": sanitized})
                await sio.emit("agent:tripState", {
                    "conversationId": conv_id,
                    "tripState": sanitized,
                    "eventId": eid,
                }, room=conv_id)

            elif event["type"] == "interrupt":
                # Save trip_state to DB so it's available on resume
                interrupt_payload = event.get("payload", {})
                trip_state_from_stream = interrupt_payload.get("tripState")
                if trip_state_from_stream:
                    async with async_session() as db:
                        result = await db.execute(
                            select(Conversation).where(Conversation.conversation_id == conv_id)
                        )
                        conversation = result.scalar_one_or_none()
                        if conversation:
                            conversation.trip_state = _sanitize_json(trip_state_from_stream)
                            await db.commit()
                            logger.info("Saved tripState to conversation (interrupt)")

                eid = await stream_buffer.push_event(conv_id, "interrupt", {"payload": event["payload"]})
                await sio.emit("agent:interrupt", {
                    "conversationId": conv_id,
                    "payload": event["payload"],
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
                        msgs = conversation.messages or []
                        msgs.append({
                            "role": "assistant",
                            "content": ai_response,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                        conversation.messages = msgs[-MAX_CONVERSATION_MESSAGES:]

                        if payload.get("tripState"):
                            conversation.trip_state = _sanitize_json(payload["tripState"])
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


@router.post("/resume")
@router.post("/resume/")
async def resume_agent(
    req: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resume agent execution after an interrupt (e.g., route confirmation).

    The message field contains the user's decision (e.g., 'confirm' or 'reject').
    """
    if not req.message or not req.conversationId:
        raise HTTPException(status_code=400, detail="Message and conversationId are required")

    conv_id = req.conversationId
    decision = req.message.lower().strip()

    # Build resume value for the interrupt
    resume_value = {
        "confirmed": decision in ("confirm", "yes", "ok", "looks good", "approve"),
        "action": decision,
    }

    logger.info(f"[RESUME] Resuming agent for conv={conv_id} with decision={decision}")

    # Mark stream as active and launch background task
    await stream_buffer.mark_active(conv_id)
    asyncio.create_task(_process_agent_resume(
        conv_id, resume_value, user.id
    ))

    return {
        "conversationId": conv_id,
        "status": "streaming",
    }


async def _process_agent_resume(conv_id: str, resume_value: dict, user_id: str):
    """Resume agent execution after interrupt and relay events via Socket.IO.

    Handles token streaming, tripState updates, DB persistence,
    and auto-build itinerary after route confirmation.
    """
    from app.agents.travel_agent import travel_agent
    from app.main import sio
    from langgraph.types import Command

    try:
        config = {"configurable": {"thread_id": conv_id, "user_id": user_id}}

        # Load current trip_state from DB
        async with async_session() as db:
            result = await db.execute(
                select(Conversation).where(Conversation.conversation_id == conv_id)
            )
            conversation = result.scalar_one_or_none()
            current_trip_state = conversation.trip_state if conversation else None

        # Resume the agent with the user's decision
        stream = await travel_agent.agent.astream_events(
            Command(resume=resume_value), config=config, version="v3"
        )

        response_text = ""
        async for message_event in stream.messages:
            text = str(message_event.text)
            if text:
                eid = await stream_buffer.push_event(conv_id, "token", {"text": text})
                await sio.emit("agent:token", {
                    "conversationId": conv_id,
                    "text": text,
                    "eventId": eid,
                }, room=conv_id)
                response_text += text

        # Check for further interrupts
        if stream.interrupted:
            interrupt_info = stream.interrupts[0].value if stream.interrupts else {}
            eid = await stream_buffer.push_event(conv_id, "interrupt", {"payload": interrupt_info})
            await sio.emit("agent:interrupt", {
                "conversationId": conv_id,
                "payload": interrupt_info,
                "eventId": eid,
            }, room=conv_id)
            await stream_buffer.mark_done(conv_id)
            return

        if not response_text:
            response_text = "Route confirmed. Building your itinerary..."

        # After resume, run the auto-build flow (route proposal → itinerary)
        final_trip_state = current_trip_state
        if final_trip_state and resume_value.get("confirmed"):
            eid = await stream_buffer.push_event(conv_id, "status", {"status": "Building your itinerary..."})
            await sio.emit("agent:status", {
                "conversationId": conv_id,
                "status": "Building your itinerary...",
                "eventId": eid,
            }, room=conv_id)

            final_trip_state = await travel_agent._auto_build_itinerary(final_trip_state)
            if final_trip_state.get("itinerary"):
                response_text = "I've put together your itinerary! Check it out on the right — you can ask me to adjust anything."

            sanitized_ts = _sanitize_json(final_trip_state)
            eid = await stream_buffer.push_event(conv_id, "tripState", {"tripState": sanitized_ts})
            await sio.emit("agent:tripState", {
                "conversationId": conv_id,
                "tripState": sanitized_ts,
                "eventId": eid,
            }, room=conv_id)

        # Persist to DB
        async with async_session() as db:
            result = await db.execute(
                select(Conversation).where(Conversation.conversation_id == conv_id)
            )
            conversation = result.scalar_one_or_none()
            if conversation:
                msgs = conversation.messages or []
                msgs.append({
                    "role": "assistant",
                    "content": response_text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                conversation.messages = msgs[-MAX_CONVERSATION_MESSAGES:]

                if final_trip_state:
                    conversation.trip_state = _sanitize_json(final_trip_state)
                    logger.info("Saved tripState to conversation after resume")

                await db.commit()

        # Build widgets + suggestions
        from app.agents.state import check_slots
        post_check = check_slots(final_trip_state)
        widgets = travel_agent._build_widgets(final_trip_state, post_check)
        suggestions = travel_agent._build_suggestions(final_trip_state, post_check)

        # Emit final response
        final_payload = {
            "message": response_text,
            "conversationId": conv_id,
            "widgets": widgets,
            "suggestions": suggestions,
            "changeSummary": [],
            "classification": None,
            "tripState": _sanitize_json(final_trip_state),
        }
        eid = await stream_buffer.push_event(conv_id, "response", final_payload)
        final_payload["eventId"] = eid
        await sio.emit("agent:response", final_payload, room=conv_id)

    except Exception as e:
        logger.error(f"[RESUME_TASK] Failed: {e}")
        error_payload = {
            "message": f"Error resuming: {e}",
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
