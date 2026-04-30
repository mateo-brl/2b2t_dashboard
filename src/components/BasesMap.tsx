import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { useBases } from "../api/useBases";
import { useStream } from "../api/StreamContext";
import { useCoverage } from "../api/useCoverage";
import { useZones } from "../api/useZones";
import type { BotTickEvent } from "../api/types";
import {
  DIMENSIONS,
  dimensionBounds,
  worldToLatLng,
  latLngToWorld,
  type Dimension,
} from "../map/worldCoords";
import { highwaysLayer } from "../map/highways";
import type { Zone } from "../api/zones";

const baseColor: Record<string, string> = {
  STASH: "#f59e0b",
  STORAGE: "#facc15",
  CONSTRUCTION: "#a78bfa",
  PORTAL: "#fb7185",
  MAP_ART: "#34d399",
  TRAIL: "#7dd3fc",
  FARM: "#86efac",
  CAVE_MINING: "#94a3b8",
};

function colorFor(type: string): string {
  return baseColor[type] ?? "#cbd5e1";
}

/**
 * Build the popup DOM for a base. Inline DOM (not innerHTML) so the
 * "Supprimer" button can carry a real click handler — innerHTML strings
 * are inert in Leaflet popups.
 */
function buildBasePopup(
  b: Record<string, unknown>,
  onDelete: (key: string) => Promise<void>,
): HTMLElement {
  const cx = Number(b.chunk_x);
  const cz = Number(b.chunk_z);
  const wx = Number(b.world_x ?? cx * 16 + 8);
  const wz = Number(b.world_z ?? cz * 16 + 8);
  const score = Number(b.score) || 0;
  const baseType = String(b.base_type ?? "?");
  const color = colorFor(baseType);

  const root = document.createElement("div");
  root.style.cssText =
    "font:12px ui-monospace,monospace;color:#e6e8ef;background:#1a1d24;padding:8px 10px;border-radius:6px;border:1px solid #2e303a;min-width:220px";

  root.innerHTML = `
    <div style="color:${color};font-weight:600">${baseType}</div>
    <div>chunk(${cx}, ${cz}) · ${String(b.dimension ?? "?")}</div>
    <div>world(${wx}, ${b.world_y ?? "?"}, ${wz})</div>
    <div>score ${score.toFixed(1)} · seq #${String(b.seq ?? "?")}</div>
  `;

  const btn = document.createElement("button");
  btn.textContent = "Supprimer";
  btn.style.cssText =
    "margin-top:8px;padding:4px 10px;border-radius:4px;border:1px solid #7f1d1d;background:#450a0a;color:#fca5a5;cursor:pointer;font:11px ui-monospace,monospace;width:100%";
  btn.onmouseenter = () => (btn.style.background = "#7f1d1d");
  btn.onmouseleave = () => (btn.style.background = "#450a0a");
  btn.onclick = async () => {
    const key = String(b.idempotency_key ?? "");
    if (!key) return;
    btn.disabled = true;
    btn.textContent = "Suppression…";
    try {
      await onDelete(key);
    } catch {
      btn.textContent = "Erreur";
    }
  };
  root.appendChild(btn);
  return root;
}

type Filters = { dim: Dimension; minScore: number };

function FiltersBar({
  filters,
  setFilters,
  count,
  showCoverage,
  setShowCoverage,
  showZones,
  setShowZones,
  onCenterOnBot,
  hasBotPosition,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  count: number;
  showCoverage: boolean;
  setShowCoverage: (v: boolean) => void;
  showZones: boolean;
  setShowZones: (v: boolean) => void;
  onCenterOnBot: () => void;
  hasBotPosition: boolean;
}) {
  const dims: Dimension[] = ["overworld", "nether", "end"];
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
      <div className="inline-flex overflow-hidden rounded border border-zinc-700">
        {dims.map((d) => (
          <button
            key={d}
            onClick={() => setFilters({ ...filters, dim: d })}
            className={
              "px-3 py-1 text-xs transition-colors " +
              (filters.dim === d
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800")
            }
          >
            {DIMENSIONS[d].label}
          </button>
        ))}
      </div>
      <span className="text-zinc-500">Min score</span>
      <input
        type="number"
        value={filters.minScore}
        min={0}
        onChange={(e) =>
          setFilters({ ...filters, minScore: Number(e.target.value) || 0 })
        }
        className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={showCoverage}
          onChange={(e) => setShowCoverage(e.target.checked)}
          className="accent-emerald-500"
        />
        Coverage
      </label>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={showZones}
          onChange={(e) => setShowZones(e.target.checked)}
          className="accent-blue-500"
        />
        Zones
      </label>
      <button
        onClick={onCenterOnBot}
        disabled={!hasBotPosition}
        className="rounded border border-cyan-700 bg-cyan-900/40 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-900/70 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600"
      >
        Centrer sur le bot
      </button>
      <span className="ml-auto text-zinc-500">{count} bases shown</span>
    </div>
  );
}

/**
 * Build the GeoJSON Feature payload that we ship to the backend when the
 * user creates / edits a Geoman shape. We persist the canonical Leaflet
 * Geoman geometry so the bot can re-rehydrate the shape exactly.
 *
 * Coords are in CRS.Simple latlng = (-Z, X). The bot does the inverse
 * transform when consuming.
 */
function layerToGeometry(layer: L.Layer, shape: string): {
  geometry: { type: string; coordinates: unknown };
  shape: string;
} {
  if (layer instanceof L.Circle) {
    const c = layer.getLatLng();
    const r = layer.getRadius();
    return {
      shape,
      geometry: {
        type: "Circle",
        // Custom geometry: GeoJSON has no Circle; we store
        // [centerX, centerZ, radiusBlocks] for the bot's convenience.
        coordinates: {
          centerX: c.lng,
          centerZ: -c.lat,
          radius: r,
        },
      },
    };
  }
  if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
    const latlngs = layer.getLatLngs() as L.LatLng[][];
    // Support holes : the first ring is the outer boundary.
    const rings = latlngs.map((ring) =>
      ring.map((ll) => {
        const w = latLngToWorld(ll);
        return [w.x, w.z];
      }),
    );
    return {
      shape,
      geometry: {
        type: "Polygon",
        coordinates: rings,
      },
    };
  }
  return { shape, geometry: { type: "Unknown", coordinates: null } };
}

/** Inverse: rebuild a Leaflet layer from a stored zone. */
function geometryToLayer(zone: Zone, color: string): L.Layer | null {
  const g = zone.geometry as { type: string; coordinates: unknown };
  if (g.type === "Circle") {
    const c = g.coordinates as { centerX: number; centerZ: number; radius: number };
    return L.circle(worldToLatLng(c.centerX, c.centerZ), {
      radius: c.radius,
      color,
      fillColor: color,
      fillOpacity: 0.12,
      weight: 2,
    });
  }
  if (g.type === "Polygon") {
    const rings = g.coordinates as number[][][];
    const latlngs = rings.map((ring) => ring.map(([x, z]) => worldToLatLng(x, z)));
    if (zone.shape === "Rectangle" && latlngs.length === 1 && latlngs[0].length === 5) {
      const ring = latlngs[0];
      // points 0 and 2 are opposite corners
      const p0 = L.latLng(ring[0] as L.LatLngTuple);
      const p2 = L.latLng(ring[2] as L.LatLngTuple);
      return L.rectangle(L.latLngBounds(p0, p2), {
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 2,
      });
    }
    return L.polygon(latlngs, {
      color,
      fillColor: color,
      fillOpacity: 0.12,
      weight: 2,
    });
  }
  return null;
}

export function BasesMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basesLayerRef = useRef<L.LayerGroup | null>(null);
  const coverageLayerRef = useRef<L.LayerGroup | null>(null);
  const coverageRendererRef = useRef<L.Renderer | null>(null);
  const zonesLayerRef = useRef<L.FeatureGroup | null>(null);
  const playerMarkerRef = useRef<L.CircleMarker | null>(null);
  const hasFittedRef = useRef(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [filters, setFilters] = useState<Filters>({
    dim: "overworld",
    minScore: 0,
  });
  const [showCoverage, setShowCoverage] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [botPos, setBotPos] = useState<{ x: number; z: number } | null>(null);

  const apiFilters = useMemo(
    () => ({
      dim: filters.dim,
      minScore: filters.minScore || undefined,
      limit: 1000,
    }),
    [filters],
  );
  const { bases, isLoading, error, remove: removeBase } = useBases(apiFilters);
  const stream = useStream();
  const { coverage } = useCoverage(mapInstance, filters.dim, showCoverage);
  const { zones, add, patch, remove } = useZones(filters.dim);

  // Re-fit when filters change so the new selection lands in view.
  useEffect(() => {
    hasFittedRef.current = false;
  }, [filters.dim, filters.minScore]);

  // Init map (re-create on dimension change)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const meta = DIMENSIONS[filters.dim];
    container.style.backgroundColor = meta.background;

    const bounds = L.latLngBounds(
      dimensionBounds(filters.dim) as L.LatLngBoundsLiteral,
    );
    const map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -16,
      maxZoom: 14,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 80,
      attributionControl: false,
      maxBoundsViscosity: 0.8,
      preferCanvas: true,
    });
    map.fitBounds(bounds);
    map.setMaxBounds(bounds.pad(0.2));

    // Spawn anchor (always at 0,0)
    L.circleMarker(worldToLatLng(0, 0), {
      radius: 6,
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#f97316",
      fillOpacity: 1,
      interactive: false,
    })
      .bindTooltip("spawn (0, 0)", { permanent: false, opacity: 0.9 })
      .addTo(map);

    highwaysLayer(filters.dim).addTo(map);

    // Coverage layer goes BELOW everything else (fewer false collisions
    // with hover targets). Dedicated canvas renderer with extra padding so
    // the cells aren't continuously repainted on small pans.
    const coverageRenderer = L.canvas({ padding: 0.5 });
    coverageRendererRef.current = coverageRenderer;
    const coverageGroup = L.layerGroup([coverageRenderer]).addTo(map);
    coverageLayerRef.current = coverageGroup;

    const basesGroup = L.layerGroup().addTo(map);
    basesLayerRef.current = basesGroup;

    const zonesGroup = L.featureGroup().addTo(map);
    zonesLayerRef.current = zonesGroup;

    // Geoman draw toolbar
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });
    map.pm.setPathOptions({
      color: meta.accent,
      fillColor: meta.accent,
      fillOpacity: 0.12,
      weight: 2,
    });
    map.pm.setGlobalOptions({
      layerGroup: zonesGroup,
      snappable: false,
    });

    setMapInstance(map);
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      basesLayerRef.current = null;
      coverageLayerRef.current = null;
      coverageRendererRef.current = null;
      zonesLayerRef.current = null;
      playerMarkerRef.current = null;
      setMapInstance(null);
    };
  }, [filters.dim]);

  // Sync bases layer
  useEffect(() => {
    const map = mapRef.current;
    const layer = basesLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const latlngs: L.LatLngExpression[] = [];
    for (const b of bases) {
      const cx = Number(b.chunk_x);
      const cz = Number(b.chunk_z);
      if (!Number.isFinite(cx) || !Number.isFinite(cz)) continue;
      const wx = Number(b.world_x ?? cx * 16 + 8);
      const wz = Number(b.world_z ?? cz * 16 + 8);
      const score = Number(b.score) || 0;
      const radius = 5 + Math.min(9, score / 12);
      const ll = worldToLatLng(wx, wz);
      const marker = L.circleMarker(ll, {
        radius,
        color: "#ffffff",
        weight: 1,
        fillColor: colorFor(String(b.base_type)),
        fillOpacity: 0.9,
      });
      marker.bindPopup(() => buildBasePopup(b, removeBase));
      marker.addTo(layer);
      latlngs.push(ll);
    }

    if (bases.length > 0 && !hasFittedRef.current) {
      const fit = L.latLngBounds(latlngs);
      fit.extend(worldToLatLng(0, 0));
      map.fitBounds(fit, { padding: [60, 60], maxZoom: 2 });
      hasFittedRef.current = true;
    }
  }, [bases]);

  // Sync coverage layer
  useEffect(() => {
    const map = mapRef.current;
    const layer = coverageLayerRef.current;
    const renderer = coverageRendererRef.current;
    if (!map || !layer) return;
    // Toggle off → just hide. We re-clear lazily when new data arrives so
    // the user doesn't see a blank flash.
    if (!showCoverage) {
      layer.clearLayers();
      if (renderer) layer.addLayer(renderer);
      return;
    }
    if (!coverage) return;
    layer.clearLayers();
    if (renderer) layer.addLayer(renderer);
    const cellBlocks = coverage.cellSizeBlocks;
    const maxCount = Math.max(1, coverage.grid * coverage.grid);
    for (const cell of coverage.cells) {
      const x0 = cell.cx * cellBlocks;
      const x1 = x0 + cellBlocks;
      const z0 = cell.cz * cellBlocks;
      const z1 = z0 + cellBlocks;
      const ratio = Math.min(1, cell.count / maxCount);
      // Discrete opacity buckets so the density palette reads at a glance
      // and keeps cells visually quiet (max 0.30).
      const fillOpacity = ratio < 0.05 ? 0.07
        : ratio < 0.25 ? 0.13
        : ratio < 0.5 ? 0.20
        : 0.28;
      L.rectangle(
        L.latLngBounds(worldToLatLng(x0, z0), worldToLatLng(x1, z1)),
        {
          color: "#10b981",
          weight: 0,
          fillColor: "#10b981",
          fillOpacity,
          interactive: false,
          renderer: renderer ?? undefined,
        },
      ).addTo(layer);
    }
  }, [coverage, showCoverage, filters.dim]);

  // Sync zones from backend → map. We rebuild the layer group from scratch
  // each time the zones array changes so deletes / edits from another tab
  // are reflected. Geoman editing live on the same map mutates the layer
  // in place; the next reload picks up the patched geometry.
  useEffect(() => {
    const map = mapRef.current;
    const layer = zonesLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!showZones) return;
    const accent = DIMENSIONS[filters.dim].accent;
    for (const zone of zones) {
      const built = geometryToLayer(zone, accent);
      if (!built) continue;
      // Tag the layer with the backend id so pm:edit/pm:remove can call
      // the right CRUD endpoint.
      (built as L.Layer & { __zoneId?: number }).__zoneId = zone.id;
      built.bindTooltip(
        `${zone.name}${zone.active ? "" : " (off)"}`,
        { sticky: true, opacity: 0.85 },
      );
      built.addTo(layer);
    }
  }, [zones, showZones, filters.dim]);

  // Wire Geoman events → backend CRUD. We bind once per map instance.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const dimAtMount = filters.dim;

    const onCreate = (e: { layer: L.Layer; shape: string }) => {
      const meta = layerToGeometry(e.layer, e.shape);
      void add({
        dim: dimAtMount,
        shape: meta.shape,
        geometry: meta.geometry as unknown as Zone["geometry"],
        active: true,
      })
        .then((z) => {
          (e.layer as L.Layer & { __zoneId?: number }).__zoneId = z.id;
        })
        .catch((err) => console.error("[BasesMap] create zone failed:", err));
    };

    const onEdit = (e: { layer: L.Layer; shape?: string }) => {
      const layer = e.layer as L.Layer & { __zoneId?: number };
      if (layer.__zoneId == null) return;
      const meta = layerToGeometry(e.layer, e.shape ?? "Polygon");
      void patch(layer.__zoneId, {
        geometry: meta.geometry as unknown as Zone["geometry"],
        shape: meta.shape,
      }).catch((err) => console.error("[BasesMap] edit zone failed:", err));
    };

    const onRemove = (e: { layer: L.Layer }) => {
      const layer = e.layer as L.Layer & { __zoneId?: number };
      if (layer.__zoneId == null) return;
      void remove(layer.__zoneId).catch((err) =>
        console.error("[BasesMap] delete zone failed:", err),
      );
    };

    map.on("pm:create", onCreate);
    map.on("pm:edit", onEdit);
    map.on("pm:remove", onRemove);
    return () => {
      map.off("pm:create", onCreate);
      map.off("pm:edit", onEdit);
      map.off("pm:remove", onRemove);
    };
  }, [mapInstance, add, patch, remove, filters.dim]);

  // Live player position via SSE bot_tick events (filtered by dim).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (stream.events.length === 0) return;

    // Walk the stream from newest to oldest, find the latest bot_tick for
    // the current dimension. Cheap because cap=200.
    let latest: BotTickEvent | null = null;
    for (let i = stream.events.length - 1; i >= 0; i--) {
      const e = stream.events[i];
      if (e.type === "bot_tick") {
        const t = e as BotTickEvent;
        if (t.dimension === filters.dim) {
          latest = t;
          break;
        }
      }
    }
    if (!latest) return;
    const ll = worldToLatLng(latest.pos_x, latest.pos_z);
    setBotPos({ x: latest.pos_x, z: latest.pos_z });
    if (!playerMarkerRef.current) {
      playerMarkerRef.current = L.circleMarker(ll, {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#22d3ee",
        fillOpacity: 1,
      })
        .bindTooltip("bot", { permanent: false, opacity: 0.9 })
        .addTo(map);
    } else {
      playerMarkerRef.current.setLatLng(ll);
    }
  }, [stream.events, filters.dim]);

  const centerOnBot = () => {
    const map = mapRef.current;
    if (!map || !botPos) return;
    map.flyTo(worldToLatLng(botPos.x, botPos.z), Math.max(map.getZoom(), 0), {
      duration: 0.6,
    });
  };

  return (
    <div className="space-y-2">
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        count={bases.length}
        showCoverage={showCoverage}
        setShowCoverage={setShowCoverage}
        showZones={showZones}
        setShowZones={setShowZones}
        onCenterOnBot={centerOnBot}
        hasBotPosition={botPos !== null}
      />
      <div className="relative h-[640px] overflow-hidden rounded-lg border border-zinc-800">
        <div ref={containerRef} className="absolute inset-0" />
        {isLoading && (
          <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded bg-zinc-900/80 px-2 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">
            loading bases…
          </div>
        )}
        {error && (
          <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded bg-red-900/80 px-2 py-1 text-xs text-red-200 ring-1 ring-red-500/40">
            {error}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-600">
        Coords MC natives · Spawn = ●, bot = cyan · highways = pointillés ·
        coverage = vert (chunks scannés) · outils dessin (haut-gauche) →
        zones envoyées au bot.
      </p>
    </div>
  );
}
