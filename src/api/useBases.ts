import { useCallback, useEffect, useState } from "react";
import { deleteBase, fetchBases, type BasesFilters } from "./bases";
import { useStream } from "./StreamContext";
import type { BaseFoundEvent } from "./types";

export type UseBasesState = {
  bases: BaseFoundEvent[];
  isLoading: boolean;
  error: string | null;
  remove: (idempotencyKey: string) => Promise<void>;
};

/**
 * Loads the historical {@code base_found} events through {@code GET /v1/bases},
 * then keeps the list growing live by listening to the shared SSE stream and
 * picking out new {@code base_found} events.
 *
 * Dedup is done by {@code idempotency_key}. The list is not capped because
 * we want every detected base on the map; if memory becomes an issue
 * (>10k bases on a long-running session), add a cap based on score.
 */
export function useBases(filters: BasesFilters = {}): UseBasesState {
  const [bases, setBases] = useState<BaseFoundEvent[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stream = useStream();

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBases(filters)
      .then((res) => {
        if (cancelled) return;
        setBases(res.bases);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dim, filters.minScore, filters.limit]);

  // Live: pick out base_found events from the SSE stream and merge in
  useEffect(() => {
    if (stream.events.length === 0) return;
    const incoming = stream.events.filter(
      (e): e is BaseFoundEvent => e.type === "base_found",
    );
    if (incoming.length === 0) return;
    setBases((prev) => {
      const seen = new Set(prev.map((b) => b.idempotency_key));
      const next = [...prev];
      for (const b of incoming) {
        if (!seen.has(b.idempotency_key)) {
          seen.add(b.idempotency_key);
          // Apply same filters as initial fetch on live additions
          if (filters.dim && b.dimension !== filters.dim) continue;
          if (filters.minScore != null && Number(b.score) < filters.minScore) continue;
          next.push(b);
        }
      }
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.events, filters.dim, filters.minScore]);

  const remove = useCallback(async (idempotencyKey: string) => {
    // Optimistic: drop from local state immediately, then DELETE on backend.
    setBases((prev) => prev.filter((b) => b.idempotency_key !== idempotencyKey));
    try {
      await deleteBase(idempotencyKey);
    } catch (e) {
      // On failure, surface error and reload the list to resync.
      setError(String(e));
      const fresh = await fetchBases(filters);
      setBases(fresh.bases);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dim, filters.minScore, filters.limit]);

  return { bases, isLoading, error, remove };
}
