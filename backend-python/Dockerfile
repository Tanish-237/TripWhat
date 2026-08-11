FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic pydantic pydantic-settings langchain langchain-openai langgraph httpx python-socketio pyjwt bcrypt google-api-python-client google-auth-oauthlib email-validator greenlet

COPY . .

EXPOSE 5000

CMD ["uvicorn", "app.main:asgi_app", "--host", "0.0.0.0", "--port", "5000"]
