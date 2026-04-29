import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useBases } from "../api/useBases";

/**
 * Minecraft uses a Cartesian coordinate system; MapLibre's globe expects
 * longitudes (-180..180) and latitudes (-85..85). We pick a linear scale
 * that maps the 2b2t world (~±30M blocks) into the visible world rect:
 *   lng = mcX * 180 / SCALE
 *   lat = -mcZ * 85 / SCALE   (Z+ in MC ≈ south = lat-)
 * SCALE picked at 500_000 so the typical exploration zone (±3M blocks)
 * occupies most of the globe — the user can pan/zoom freely from there.
 */
const SCALE = 500_000;

function mcToLngLat(mcX: number, mcZ: number): [number, number] {
  const lng = (mcX * 180) / SCALE;
  const lat = (-mcZ * 85) / SCALE;
  return [Math.max(-179.9, Math.min(179.9, lng)), Math.max(-84.9, Math.min(84.9, lat))];
}

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

const BLANK_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0b0d12" },
    },
  ],
};

type Filters = { dim: string; minScore: number };

function FiltersBar({
  filters,
  setFilters,
  count,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
      <span className="text-zinc-500">Dimension</span>
      <select
        value={filters.dim}
        onChange={(e) => setFilters({ ...filters, dim: e.target.value })}
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200"
      >
        <option value="">All</option>
        <option value="overworld">Overworld</option>
        <option value="nether">Nether</option>
        <option value="end">End</option>
      </select>
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
      <span className="ml-auto text-zinc-500">{count} bases shown</span>
    </div>
  );
}

export function BasesMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasFittedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [filters, setFilters] = useState<Filters>({ dim: "overworld", minScore: 0 });

  const apiFilters = useMemo(
    () => ({
      dim: filters.dim || undefined,
      minScore: filters.minScore || undefined,
      limit: 1000,
    }),
    [filters],
  );
  const { bases, isLoading, error } = useBases(apiFilters);

  // Re-fit when filters change so the new selection lands in view.
  useEffect(() => {
    hasFittedRef.current = false;
  }, [filters.dim, filters.minScore]);

  // Init map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: BLANK_DARK_STYLE,
      center: [0, 0],
      zoom: 4,
      attributionControl: false,
      renderWorldCopies: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");

    map.on("error", (e) => {
      // Surface map errors so we don't have an invisible-failure mode.
      // eslint-disable-next-line no-console
      console.error("[BasesMap] MapLibre error:", e.error ?? e);
    });

    // eslint-disable-next-line no-console
    console.log("[BasesMap] map created, awaiting load…");

    map.on("load", () => {
      // eslint-disable-next-line no-console
      console.log("[BasesMap] map load fired, size=", map.getCanvas().width, "x", map.getCanvas().height);

      // GeoJSON source + circle layer: rendered inside the WebGL canvas
      // so it cannot be hidden by Tailwind / global CSS resets.
      map.addSource("bases", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "bases-layer",
        type: "circle",
        source: "bases",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["coalesce", ["get", "score"], 0],
            0, 5,
            100, 14,
          ],
          "circle-color": ["coalesce", ["get", "color"], "#cbd5e1"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2,
          "circle-opacity": 0.95,
        },
      });

      // Spawn anchor as a separate static layer so it never disappears.
      map.addSource("spawn", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {},
        },
      });
      map.addLayer({
        id: "spawn-layer",
        type: "circle",
        source: "spawn",
        paint: {
          "circle-radius": 6,
          "circle-color": "#f97316",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // Click on a base point: open a popup with details.
      map.on("click", "bases-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties ?? {};
        const lngLat = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        new maplibregl.Popup({ offset: 12, closeButton: false })
          .setLngLat(lngLat)
          .setHTML(
            `<div style="font:12px ui-monospace,monospace;color:#e6e8ef;background:#1a1d24;padding:8px 10px;border-radius:6px;border:1px solid #2e303a">
              <div style="color:${String(p.color ?? "#cbd5e1")};font-weight:600">${String(p.base_type ?? "?")}</div>
              <div>chunk(${p.chunk_x}, ${p.chunk_z}) · ${String(p.dimension ?? "?")}</div>
              <div>world(${p.world_x}, ${p.world_y ?? "?"}, ${p.world_z})</div>
              <div>score ${Number(p.score ?? 0).toFixed(1)} · seq #${p.seq}</div>
            </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "bases-layer", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "bases-layer", () => (map.getCanvas().style.cursor = ""));

      requestAnimationFrame(() => map.resize());
      setMapReady(true);
    });

    // Watch container resizes so the canvas stays in sync with layout.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync GeoJSON source with bases.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    // eslint-disable-next-line no-console
    console.log("[BasesMap] sync layer: bases=", bases.length);

    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const b of bases) {
      const cx = Number(b.chunk_x);
      const cz = Number(b.chunk_z);
      if (!Number.isFinite(cx) || !Number.isFinite(cz)) continue;
      const wx = Number(b.world_x ?? cx * 16 + 8);
      const wz = Number(b.world_z ?? cz * 16 + 8);
      const score = Number(b.score) || 0;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: mcToLngLat(wx, wz) },
        properties: {
          idempotency_key: b.idempotency_key,
          seq: b.seq,
          base_type: b.base_type,
          dimension: b.dimension,
          chunk_x: cx,
          chunk_z: cz,
          world_x: wx,
          world_y: b.world_y,
          world_z: wz,
          score,
          color: colorFor(String(b.base_type)),
        },
      });
    }
    const source = map.getSource("bases") as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });

    // Auto-fit bounds when we have at least one base and the user has not
    // panned manually.
    if (bases.length > 0 && !hasFittedRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([0, 0]); // include spawn so the user keeps the anchor
      for (const f of features) {
        bounds.extend(f.geometry.coordinates as [number, number]);
      }
      map.fitBounds(bounds, { padding: 60, maxZoom: 4, duration: 600 });
      hasFittedRef.current = true;
    }
  }, [bases, mapReady]);

  return (
    <div className="space-y-2">
      <FiltersBar filters={filters} setFilters={setFilters} count={bases.length} />
      <div className="relative h-[480px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40">
        <div ref={containerRef} className="absolute inset-0" />
        {isLoading && (
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-zinc-900/80 px-2 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">
            loading bases…
          </div>
        )}
        {error && (
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-red-900/80 px-2 py-1 text-xs text-red-200 ring-1 ring-red-500/40">
            {error}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-600">
        Coords MC ±{(SCALE / 1_000_000).toFixed(1)}M ↔ globe MapLibre. Z inversé (sud =
        lat−). Cliquez un point pour le détail.
      </p>
    </div>
  );
}
