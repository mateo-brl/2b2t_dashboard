import { useMemo } from "react";
import { useBases } from "./useBases";
import { useReview } from "./ReviewContext";
import type { BaseFoundEvent } from "./types";
import type { BasesFilters } from "./bases";

/**
 * Combine les bases live (events {@code base_found} dans la DB) avec les
 * bases "fantômes" reconstruites depuis la {@code base_reviews} table.
 *
 * Use case : l'utilisateur a déjà reviewé des bases dont l'event source
 * a été supprimé (purge DB ou DELETE /v1/bases/{key}) — sans cette
 * fusion, ses notes et screenshots seraient invisibles dans la liste.
 *
 * Pour les fantômes on parse la clé d'idempotence
 * ({@code dim:chunkX:chunkZ:TYPE}) pour reconstruire les coords et
 * le type. Score et timestamp restent à 0 puisque non disponibles.
 */
export function useCombinedBases(filters: BasesFilters): {
  bases: BaseFoundEvent[];
  isLoading: boolean;
  error: string | null;
  remove: (key: string) => Promise<void>;
} {
  const { bases, isLoading, error, remove } = useBases(filters);
  const { map: reviewMap } = useReview();

  const combined = useMemo(() => {
    const byKey = new Map<string, BaseFoundEvent>();
    for (const b of bases) byKey.set(b.idempotency_key, b);

    for (const [key, _status] of reviewMap) {
      if (byKey.has(key)) continue;
      const parts = key.split(":");
      if (parts.length !== 4) continue;
      const [dim, cxStr, czStr, type] = parts;
      // Filter by dim if requested.
      if (filters.dim && dim !== filters.dim) continue;
      const cx = Number(cxStr);
      const cz = Number(czStr);
      if (!Number.isFinite(cx) || !Number.isFinite(cz)) continue;
      const ghost: BaseFoundEvent = {
        type: "base_found",
        idempotency_key: key,
        seq: 0,
        ts_utc_ms: 0,
        chunk_x: cx,
        chunk_z: cz,
        dimension: dim,
        base_type: type,
        score: 0,
        world_x: cx * 16 + 8,
        world_y: 64,
        world_z: cz * 16 + 8,
      };
      byKey.set(key, ghost);
    }

    return Array.from(byKey.values());
  }, [bases, reviewMap, filters.dim]);

  return { bases: combined, isLoading, error, remove };
}
