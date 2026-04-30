import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { fetchCoverage, type CoverageResponse } from "./coverage";

/**
 * Choisit la granularité de la grille (en chunks par cellule) en fonction
 * du zoom Leaflet courant. Au plus on dézoome, au plus la cellule est
 * grosse, pour éviter de retourner des millions de cellules quand on
 * regarde tout 2b2t.
 */
/**
 * Choisit la granularité de la grille (en chunks par cellule) pour que
 * chaque cellule rende à peu près 12-30 pixels à l'écran, quel que soit
 * le zoom. À ce ratio les cellules sont visibles sans agglutination ni
 * trous, et leur nombre reste raisonnable (~viewport_pixels² / 400).
 *
 * Leaflet CRS.Simple : 1 unité world = 2^zoom pixels. Une cell de N
 * chunks = N*16 blocs = N*16 * 2^zoom pixels. On vise ~16 px/cell, donc
 * N = 1 / 2^zoom = 2^-zoom (puis arrondi à une puissance de 2 pratique).
 */
function pickGridSize(zoom: number): number {
  // Target cell size in chunks so the cell takes ~16 px on screen.
  // 16 px / (16 blocks * 2^zoom) = 1 / 2^zoom = 2^-zoom
  const ideal = Math.pow(2, -zoom);
  // Snap to a clean power of 2 in [1, 4096], biased upward to avoid
  // returning hundreds of thousands of cells.
  const power = Math.max(0, Math.min(12, Math.ceil(Math.log2(ideal))));
  return Math.pow(2, power);
}

/**
 * Hook qui charge la coverage du viewport courant et la re-charge à chaque
 * mouvement / zoom / changement de dimension. Throttle de 250 ms via
 * setTimeout pour éviter de saturer le backend pendant le pan.
 */
export function useCoverage(map: L.Map | null, dim: string, enabled: boolean) {
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map || !enabled) {
      setCoverage(null);
      return;
    }
    const trigger = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      // Throttle 400 ms : long enough that pan/zoom doesn't trigger a
       // request per frame, short enough that the user doesn't notice a
       // delay after the gesture ends.
      timerRef.current = window.setTimeout(() => {
        const bounds = map.getBounds();
        // Pad the request 30 % beyond the visible viewport so a small pan
        // doesn't immediately leave the user staring at empty space until
        // the next request lands.
        const padded = bounds.pad(0.3);
        const w = padded.getWest();
        const e = padded.getEast();
        const n = padded.getNorth();
        const s = padded.getSouth();
        const zoom = map.getZoom();
        const grid = pickGridSize(zoom);
        const xmin = w;
        const xmax = e;
        const zmin = -n;
        const zmax = -s;
        const id = ++reqIdRef.current;
        setLoading(true);
        fetchCoverage({ dim, grid, xmin, xmax, zmin, zmax })
          .then((res) => {
            // Discard stale responses if a newer request was issued in the meantime.
            if (id !== reqIdRef.current) return;
            setCoverage(res);
            setLoading(false);
          })
          .catch(() => {
            if (id !== reqIdRef.current) return;
            setLoading(false);
          });
      }, 400);
    };

    trigger();
    map.on("moveend", trigger);
    map.on("zoomend", trigger);
    return () => {
      map.off("moveend", trigger);
      map.off("zoomend", trigger);
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [map, dim, enabled]);

  return { coverage, loading };
}
