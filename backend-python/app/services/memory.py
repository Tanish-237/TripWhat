"""User memory service — LangGraph Store-backed cross-conversation memory.

Stores long-term user preferences (home airport, budget style, dietary needs,
disliked activity types, etc.) keyed by user_id, so every new conversation
starts with the user's profile context instead of from scratch.
"""

from typing import Any

from app.utils.logger import logger

_store: Any = None


def set_store(store: Any) -> None:
    """Wire in the shared LangGraph store (called once from app lifespan)."""
    global _store
    _store = store


def _prefs_namespace(user_id: Any) -> tuple[str, str, str]:
    return ("users", str(user_id), "preferences")


async def get_user_memories(user_id: Any) -> list[str]:
    """Return all remembered preference texts for a user."""
    if _store is None:
        return []
    try:
        items = await _store.asearch(_prefs_namespace(user_id))
        return [it.value.get("text", "") for it in items if it.value.get("text")]
    except Exception as e:
        logger.error(f"[MEMORY] Failed to read preferences for user {user_id}: {e}")
        return []


async def remember_preference(user_id: Any, text: str) -> bool:
    """Persist a preference memory, replacing an existing identical entry."""
    if _store is None or not text.strip():
        return False
    try:
        namespace = _prefs_namespace(user_id)
        existing = await _store.asearch(namespace)
        for it in existing:
            if it.value.get("text", "").strip().lower() == text.strip().lower():
                return True  # already remembered
        key = f"pref-{abs(hash(text.strip().lower()))}"
        await _store.aput(namespace, key=key, value={"text": text.strip()})
        logger.info(f"[MEMORY] Remembered preference for user {user_id}: {text!r}")
        return True
    except Exception as e:
        logger.error(f"[MEMORY] Failed to store preference for user {user_id}: {e}")
        return False
