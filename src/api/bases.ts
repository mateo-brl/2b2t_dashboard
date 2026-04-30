import type { BaseFoundEvent } from "./types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type BasesFilters = {
  dim?: string;
  minScore?: number;
  limit?: number;
};

export type BasesResponse = {
  total: number;
  bases: BaseFoundEvent[];
};

export async function fetchBases(filters: BasesFilters = {}): Promise<BasesResponse> {
  const qs = new URLSearchParams();
  if (filters.dim) qs.set("dim", filters.dim);
  if (filters.minScore != null) qs.set("min_score", String(filters.minScore));
  if (filters.limit != null) qs.set("limit", String(filters.limit));
  const url = `${BASE_URL}/v1/bases${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function deleteBase(idempotencyKey: string): Promise<void> {
  // Path may contain colons / slashes from the bot's key format
  // ("dim:chunkX:chunkZ:type"). encodeURIComponent keeps Ktor's wildcard
  // route happy.
  const encoded = idempotencyKey
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const res = await fetch(`${BASE_URL}/v1/bases/${encoded}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
}
