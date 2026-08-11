"""Gmail service — OAuth + booking confirmation parsing.

Uses the same Google OAuth tokens as Calendar (stored in user.google_tokens).
Scopes: gmail.readonly — to search for booking confirmation emails.
"""

import re
import base64
from datetime import datetime

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings
from app.utils.logger import logger


GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "email",
    "profile",
]

BOOKING_SENDERS = [
    "noreply@booking.com",
    "confirmations@airbnb.com",
    "expedia.com",
    "hotels.com",
    "noreply@southwest.com",
    "noreply@united.com",
    "noreply@delta.com",
    "noreply@american.com",
    "noreply@emirates.com",
    "noreply@lufthansa.com",
    "noreply@british-airways.com",
    "noreply@singaporeair.com",
    "noreply@qatarairways.com",
    "noreply@airindia.com",
    "noreply@indigo.com",
    "noreply@vistara.com",
    "noreply@makemytrip.com",
    "noreply@goibibo.com",
    "noreply@cleartrip.com",
    "noreply@trip.com",
    "noreply@agoda.com",
    "noreply@kayak.com",
    " reservations@",
    " booking@",
    " confirmations@",
    " itinerary@",
]

BOOKING_KEYWORDS = [
    "booking confirmation",
    "flight confirmation",
    "hotel confirmation",
    "reservation confirmed",
    "your booking",
    "your reservation",
    "your flight",
    "your stay",
    "e-ticket",
    "boarding pass",
    "check-in",
    "reservation number",
    "confirmation code",
    "booking reference",
    "itinerary",
]


class GmailService:
    def _create_flow(self) -> Flow:
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValueError("Missing Google OAuth env vars")

        return Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.google_redirect_uri],
                }
            },
            scopes=GMAIL_SCOPES,
            redirect_uri=settings.gmail_redirect_uri,
        )

    def get_oauth_url(self, jwt_token: str) -> str:
        flow = self._create_flow()
        url, _ = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            state=jwt_token,
        )
        return url

    async def exchange_code_and_store_tokens(self, code: str, user_id: str):
        from sqlalchemy import select
        from app.database import async_session
        from app.models import User

        flow = self._create_flow()
        flow.fetch_token(code=code)
        creds = flow.credentials

        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalar_one_or_none()
            if user:
                existing = user.google_tokens or {}
                existing.update({
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token or existing.get("refresh_token"),
                    "scope": creds.scope,
                    "token_uri": creds.token_uri,
                    "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                })
                user.google_tokens = existing
                await db.commit()

    async def _get_authorized_client(self, user_id: str):
        from sqlalchemy import select
        from app.database import async_session
        from app.models import User

        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalar_one_or_none()
            if not user or not user.google_tokens:
                raise ValueError("Google not connected")

            tokens = user.google_tokens
            creds = Credentials(
                token=tokens.get("access_token"),
                refresh_token=tokens.get("refresh_token"),
                token_uri=tokens.get("token_uri"),
                client_id=tokens.get("client_id"),
                client_secret=tokens.get("client_secret"),
                scopes=tokens.get("scope", "").split(),
            )
            return build("gmail", "v1", credentials=creds)

    async def is_connected(self, user_id: str) -> bool:
        from sqlalchemy import select
        from app.database import async_session
        from app.models import User

        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalar_one_or_none()
            if not user or not user.google_tokens:
                return False
            scopes = user.google_tokens.get("scope", "")
            return "gmail" in scopes

    async def search_bookings(self, user_id: str, max_results: int = 20) -> list[dict]:
        """Search Gmail for booking confirmation emails."""
        try:
            service = await self._get_authorized_client(user_id)
        except ValueError:
            return []

        # Build search query from sender patterns and keywords
        sender_query = " OR ".join(f"from:{s}" for s in BOOKING_SENDERS[:10])
        keyword_query = " OR ".join(f'subject:"{k}"' for k in BOOKING_KEYWORDS[:8])
        query = f"({sender_query}) OR ({keyword_query}) newer_than:6m"

        try:
            results = service.users().messages().list(
                userId="me",
                q=query,
                maxResults=max_results,
            ).execute()

            messages = results.get("messages", [])
            bookings = []

            for msg in messages:
                msg_data = service.users().messages().get(
                    userId="me",
                    id=msg["id"],
                    format="full",
                ).execute()

                booking = self._parse_booking_email(msg_data)
                if booking:
                    bookings.append(booking)

            return bookings
        except Exception as e:
            logger.error(f"[GMAIL] Search failed: {e}")
            return []

    def _parse_booking_email(self, msg_data: dict) -> dict | None:
        """Parse a Gmail message into a booking summary."""
        headers = msg_data.get("payload", {}).get("headers", [])
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "")
        date_str = next((h["value"] for h in headers if h["name"] == "Date"), "")

        # Extract body text
        body = self._extract_body(msg_data.get("payload", {}))

        # Determine booking type
        booking_type = self._detect_booking_type(subject, sender, body)

        # Extract confirmation code
        conf_code = self._extract_confirmation_code(subject, body)

        # Extract dates
        dates = self._extract_dates(body)

        return {
            "id": msg_data.get("id", ""),
            "threadId": msg_data.get("threadId", ""),
            "subject": subject,
            "sender": sender,
            "date": date_str,
            "snippet": msg_data.get("snippet", "")[:200],
            "type": booking_type,
            "confirmationCode": conf_code,
            "dates": dates,
            "bodyPreview": body[:500] if body else "",
        }

    def _extract_body(self, payload: dict) -> str:
        """Extract text content from email payload."""
        if payload.get("body", {}).get("data"):
            data = payload["body"]["data"]
            try:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
            except Exception:
                return ""

        parts = payload.get("parts", [])
        for part in parts:
            mime = part.get("mimeType", "")
            if mime == "text/plain" and part.get("body", {}).get("data"):
                data = part["body"]["data"]
                try:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                except Exception:
                    pass
            elif mime == "multipart/alternative" or mime == "multipart/mixed":
                text = self._extract_body(part)
                if text:
                    return text

        return ""

    def _detect_booking_type(self, subject: str, sender: str, body: str) -> str:
        """Detect if this is a flight, hotel, or other booking."""
        text = (subject + " " + sender + " " + body).lower()
        if any(w in text for w in ["flight", "airline", "boarding", "e-ticket", "check-in", "airport"]):
            return "flight"
        if any(w in text for w in ["hotel", "stay", "check in", "check-in", "room", "resort", "accommodation"]):
            return "hotel"
        if any(w in text for w in ["restaurant", "table", "dining"]):
            return "restaurant"
        return "other"

    def _extract_confirmation_code(self, subject: str, body: str) -> str | None:
        """Extract confirmation/booking reference code from email."""
        patterns = [
            r"(?:confirmation|booking|reservation)\s*(?:code|number|reference|#)[:\s]*([A-Z0-9]{6,12})",
            r"(?:ref|reference)[:\s]*([A-Z0-9]{6,12})",
            r"\b([A-Z0-9]{6})\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, subject + " " + body, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _extract_dates(self, body: str) -> dict | None:
        """Extract travel dates from email body."""
        date_pattern = r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})"
        matches = re.findall(date_pattern, body, re.IGNORECASE)
        if len(matches) >= 2:
            return {"start": matches[0], "end": matches[1]}
        elif len(matches) == 1:
            return {"start": matches[0]}
        return None


gmail_service = GmailService()
