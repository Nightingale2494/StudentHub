# StudentHub

Monorepo containing:

- `frontend/` — React web app
- `backend/` — FastAPI API

## Backend deploy note (Railway)

If Railway is configured with `uvicorn main:app`, this repo now supports that via a root-level `main.py` shim.

Recommended start command options:

- `uvicorn main:app --host 0.0.0.0 --port $PORT` (from repo root)
- `uvicorn backend.server:app --host 0.0.0.0 --port $PORT` (from repo root)
- `uvicorn main:app --host 0.0.0.0 --port $PORT` (from `backend/` directory, using `backend/main.py`)
