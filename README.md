# 2b2t-dashboard

Read-only dashboard for the BaseFinder telemetry pipeline.
Companion to [`2b2t_backend`](https://github.com/mateo-brl/2b2t_backend) and
[`2b2t_addons`](https://github.com/mateo-brl/2b2t_addons).

Phase 2 of Jalon 2 — minimal live event stream. Map, base detail view,
Discord OAuth, MapLibre rendering arrive in subsequent phases.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`)
- TanStack Query (1s polling, SSE comes later)

## Run

Backend must be reachable at `http://127.0.0.1:8080` (default). Override
with `VITE_BACKEND_URL=https://...` at build time.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/
npm run preview  # serve the built bundle (4173)
```

## What it shows

- **Header**: backend status badge (version + counters) — polls
  `/v1/health` every 2 s.
- **Recent events**: last 50 events from `/v1/events`, refreshed every 1 s.
  Color-coded by type (`base_found` amber, `bot_tick` sky).

## Notes

- The 1 s poll is intentional for the MVP — it's stateless on the
  backend side and the read load is trivial. SSE / WebSocket streaming
  is Phase 3.
- The dashboard never writes to the backend. CORS on the backend is
  configured for `localhost:5173` and `localhost:4173` only in dev.
