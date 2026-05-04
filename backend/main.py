"""Backend-local ASGI entrypoint.

Supports commands such as `uvicorn main:app` when the working directory is
`backend/`.
"""

from server import app

__all__ = ["app"]
