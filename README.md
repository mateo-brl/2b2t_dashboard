# 2b2t-dashboard

Dashboard live pour la pipeline de télémétrie BaseFinder.
Bot émetteur : [`2b2t_addons`](https://github.com/mateo-brl/2b2t_addons).
Backend ingest : [`2b2t_backend`](https://github.com/mateo-brl/2b2t_backend).

Phase 4 du Jalon 2 — carte interactive complète (Leaflet `CRS.Simple`),
flux SSE live, dessin de zones de recherche pilotant le bot.

## État actuel

| Vue | Source | Rafraîchissement |
|-----|--------|------------------|
| `HealthBadge` (header) | `GET /v1/health` | 2 s (TanStack Query) |
| `EventsList` (corps) | `GET /v1/events?limit=50` + SSE | 1 s + push live |
| `BasesMap` (corps) | `GET /v1/bases` + `GET /v1/coverage` + SSE | initial fetch + push live |

### Carte (`BasesMap`)

Carte Leaflet en `CRS.Simple` avec coords MC natives (`lat=-Z`, `lng=X`).
Bounds couvrant la full worldborder 2b2t (`±29 999 984` OW, `±3 749 998`
Nether). Rendu Canvas, StrictMode safe.

| Feature | Source | Notes |
|---------|--------|-------|
| Marqueurs bases | `GET /v1/bases?dim&min_score` + SSE merge | popup avec bouton `Supprimer` (DELETE /v1/bases/{key}) |
| Coverage chunks scannés | `GET /v1/coverage?dim&xmin&xmax&zmin&zmax&grid` | Grille auto-adaptée au zoom (~16 px/cell), opacité par densité |
| Position bot live | SSE `bot_tick` filtré par dim courante | Marker cyan, bouton `Centrer sur le bot` |
| Highways | GeoJSON statique (axes + diagonales) | OW + Nether, dimension End vide |
| Zones de recherche | `GET/POST/PUT/DELETE /v1/zones` (Geoman) | Rectangle / Polygon / Cercle / Edit / Drag / Remove |
| Toggle dimension | UI tab Overworld / Nether / End | Recrée la map (bounds + highways + accent color) |

Le bot poll les zones actives via le backend toutes les 5 s : dessiner
un rectangle restreint immédiatement le scan du bot (chunks hors zone
ignorés) **et**, au prochain `enable` de BaseHunter, force le mode
`ZONE` du module avec la bbox d'union comme bornes (zigzag dedans).

Type-coloré dans `EventsList` : `base_found` ambre, `bot_tick` ciel,
autres gris.

## Stack

- Vite 8 + React 19 + TypeScript 6
- Tailwind CSS 4 (`@tailwindcss/vite`)
- TanStack Query 5
- Leaflet 1.9 (`CRS.Simple`) + `@geoman-io/leaflet-geoman-free` (outils dessin)

Pas de routeur (single page), pas de state global, pas de tests JS
(viendra en phase ultérieure).

## Run

Le backend doit être atteignable sur `http://127.0.0.1:8080` (défaut).
Override avec `VITE_BACKEND_URL=https://...` au build.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bundle statique dans dist/ (prod)
npm run preview  # sert le bundle build (4173)
```

Build de prod : ~660 KB JS / ~190 KB gzip (Leaflet + Geoman dominent).

## Layout

```
src/
├── App.tsx                    # QueryClientProvider + StreamProvider + layout
├── main.tsx                   # Entry React (StrictMode)
├── index.css                  # @import "tailwindcss" + dark theme
├── api/
│   ├── client.ts              # fetchHealth / fetchRecentEvents
│   ├── types.ts               # BaseEvent, BotTickEvent, BaseFoundEvent, ChunksScannedBatchEvent
│   ├── eventStream.ts         # useEventStream — EventSource cap=200
│   ├── StreamContext.tsx      # Provider partagé pour la connexion SSE
│   ├── bases.ts               # fetchBases, deleteBase
│   ├── useBases.ts            # initial fetch + live SSE merge + remove()
│   ├── coverage.ts            # fetchCoverage
│   ├── useCoverage.ts         # viewport-bound coverage with zoom-adaptive grid
│   ├── zones.ts               # listZones, createZone, updateZone, deleteZone
│   └── useZones.ts            # CRUD wrapper avec optimistic updates
├── components/
│   ├── HealthBadge.tsx
│   ├── EventsList.tsx
│   └── BasesMap.tsx           # Leaflet map principale
└── map/
    ├── worldCoords.ts         # worldToLatLng, latLngToWorld, dimensionBounds
    └── highways.ts            # Layer GeoJSON highways par dimension
```

## CORS

Le backend autorise par défaut `localhost:5173/4173` (Vite dev/preview)
en `GET/POST/PUT/DELETE/OPTIONS`. Cf.
[`2b2t_backend/src/main/kotlin/com/basefinder/backend/Main.kt`](https://github.com/mateo-brl/2b2t_backend/blob/main/src/main/kotlin/com/basefinder/backend/Main.kt).

## Notes

- SSE live via `EventSource("/v1/events/stream")` ; cap 200 events
  côté client.
- Le dashboard POST/PUT/DELETE sur le backend uniquement pour
  `/v1/zones/*` et `DELETE /v1/bases/{key}`. Pas d'écriture
  arbitraire dans `bot_events`.
- L'authentification (Discord OAuth) n'est pas en place — le dashboard
  doit donc rester sur un réseau de confiance (localhost / VPN) tant
  que cette phase n'est pas livrée.

## Licence

GPL-3.0 (cohérent avec le bot et le backend).
