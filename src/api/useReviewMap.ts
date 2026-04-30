import { useCallback, useEffect, useState } from "react";
import {
  fetchReviewsByStatus,
  type ReviewStatus,
} from "./reviews";

/**
 * Charge l'état de review de toutes les bases déjà reviewées (REAL,
 * FALSE_POSITIVE, INTERESTING). Toute base absente de la map résultante
 * est implicitement PENDING.
 *
 * Auto-refresh toutes les 10 s pour suivre les reviews qu'on vient de
 * faire ou qu'un autre client (autre onglet, futur dashboard public)
 * pourrait pousser.
 */
export type ReviewMap = Map<string, ReviewStatus>;

export function useReviewMap(): {
  map: ReviewMap;
  loading: boolean;
  refresh: () => Promise<void>;
  markLocally: (baseKey: string, status: ReviewStatus) => void;
} {
  const [map, setMap] = useState<ReviewMap>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [real, falsePos, interesting] = await Promise.all([
        fetchReviewsByStatus("REAL", 1000),
        fetchReviewsByStatus("FALSE_POSITIVE", 1000),
        fetchReviewsByStatus("INTERESTING", 1000),
      ]);
      const next: ReviewMap = new Map();
      for (const r of real) next.set(r.baseKey, "REAL");
      for (const r of falsePos) next.set(r.baseKey, "FALSE_POSITIVE");
      for (const r of interesting) next.set(r.baseKey, "INTERESTING");
      setMap(next);
    } catch (e) {
      // Silently keep previous map; the panel will surface errors locally.
      // eslint-disable-next-line no-console
      console.warn("[useReviewMap] refresh failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const markLocally = useCallback((baseKey: string, status: ReviewStatus) => {
    setMap((prev) => {
      const next = new Map(prev);
      if (status === "PENDING") next.delete(baseKey);
      else next.set(baseKey, status);
      return next;
    });
  }, []);

  return { map, loading, refresh, markLocally };
}

export function statusColor(status: ReviewStatus | undefined): string {
  switch (status) {
    case "REAL":
      return "var(--emerald)";
    case "INTERESTING":
      return "var(--cyan)";
    case "FALSE_POSITIVE":
      return "var(--text-30)";
    case "PENDING":
    case undefined:
    default:
      return "var(--amber)";
  }
}
