"""Railway/ASGI entrypoint shim.

This file exists so platforms configured with `uvicorn main:app` can boot
without needing path-specific module names.
"""

from backend.server import app

__all__ = ["app"]
