"""Vercel ASGI entrypoint; the same application is used in Docker."""
from backend.main import app

__all__ = ["app"]
