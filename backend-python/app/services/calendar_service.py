"""Google Calendar service — OAuth + event management."""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings


class CalendarService:
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
            scopes=[
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/calendar.readonly",
                "openid",
                "email",
                "profile",
            ],
            redirect_uri=settings.google_redirect_uri,
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
                user.google_tokens = {
                    "access_token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "scope": creds.scope,
                    "token_uri": creds.token_uri,
                    "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                }
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
            return build("calendar", "v3", credentials=creds)

    async def list_upcoming_events(self, user_id: str, max_results: int = 20) -> list[dict]:
        service = await self._get_authorized_client(user_id)
        from datetime import datetime, timezone
        events_result = service.events().list(
            calendarId="primary",
            timeMin=datetime.now(timezone.utc).isoformat() + "Z",
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        return events_result.get("items", [])

    async def create_event(self, user_id: str, event_data: dict) -> dict:
        service = await self._get_authorized_client(user_id)
        event = service.events().insert(
            calendarId="primary",
            body={
                "summary": event_data.get("summary"),
                "description": event_data.get("description"),
                "location": event_data.get("location"),
                "start": {"dateTime": event_data.get("start"), "timeZone": event_data.get("timeZone")},
                "end": {"dateTime": event_data.get("end"), "timeZone": event_data.get("timeZone")},
            },
        ).execute()
        return event


calendar_service = CalendarService()
