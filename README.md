# 2b2t-dashboard

Dashboard read-only pour la pipeline de télémétrie BaseFinder.
Bot émetteur : [`2b2t_addons`](https://github.com/mateo-brl/2b2t_addons).
Backend ingest : [`2b2t_backend`](https://github.com/mateo-brl/2b2t_backend).

Phase 2 du Jalon 2 — flux d'événements live minimal. Carte des bases,
vue détail, Discord OAuth, rendu MapLibre arrivent dans les phases
suivantes.

## État actuel

| Vue | Source | Rafraîchissement |
|-----|--------|------------------|
| `HealthBadge` (header) | `GET /v1/health` | 2 s (TanStack Query) |
| `EventsList` (corps) | `GET /v1/events?limit=50` | 1 s |

Type-coloré : `base_found` ambre, `bot_tick` ciel, autres gris.

## Stack

- Vite 8 + React 19 + TypeScript 6
- Tailwind CSS 4 (`@tailwindcss/vite`)
- TanStack Query 5 (polling, SSE viendra en Phase 3)

Pas de routeur (single page), pas de state global (Zustand viendra avec
les filtres et la carte), pas encore de tests JS (Phase 4).

## Run

Le backend doit être atteignable sur `http://127.0.0.1:8080` (défaut).
Override avec `VITE_BACKEND_URL=https://...` au build.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bundle statique dans dist/ (prod)
npm run preview  # sert le bundle build (4173)
```

Build de prod : ~228 KB JS / ~71 KB gzip.

## Layout

```
src/
├── App.tsx                    # QueryClientProvider + layout (header + section events)
├── main.tsx                   # Entry React
├── index.css                  # @import "tailwindcss" + dark theme
├── api/
│   ├── client.ts              # fetch wrappers fetchHealth / fetchRecentEvents
│   └── types.ts               # BaseEvent, BotTickEvent, BaseFoundEvent, *Response
└── components/
    ├── HealthBadge.tsx        # Badge backend (green/red/loading)
    └── EventsList.tsx         # Tableau live (newest first)
```

## CORS

Le backend autorise par défaut `localhost:5173` (Vite dev) et
`localhost:4173` (Vite preview). Cf.
[`2b2t_backend/src/main/kotlin/com/basefinder/backend/Main.kt`](https://github.com/mateo-brl/2b2t_backend/blob/main/src/main/kotlin/com/basefinder/backend/Main.kt).

## Notes

- Polling 1 s : intentionnel pour le MVP — le backend est stateless
  côté lecture, et la charge est triviale. Le push live (SSE ou WS)
  arrive en Phase 3.
- Le dashboard ne POST jamais sur le backend (lecture seule).
- L'authentification (Discord OAuth) n'est pas en place — le dashboard
  doit donc rester sur un réseau de confiance (localhost / VPN) tant
  que la Phase 4 n'est pas livrée.

## Licence

GPL-3.0 (cohérent avec le bot et le backend).
