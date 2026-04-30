const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: string; coordinates: unknown };

export type Zone = {
  id: number;
  name: string;
  dim: string;
  shape: string;
  geometry: GeoJsonGeometry;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ZoneCreatePayload = {
  name?: string;
  dim: string;
  shape: string;
  geometry: GeoJsonGeometry;
  active?: boolean;
};

export type ZoneUpdatePayload = Partial<{
  name: string;
  shape: string;
  geometry: GeoJsonGeometry;
  active: boolean;
}>;

async function json<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function listZones(dim?: string, activeOnly = false): Promise<Zone[]> {
  const qs = new URLSearchParams();
  if (dim) qs.set("dim", dim);
  if (activeOnly) qs.set("active", "true");
  const res = await fetch(
    `${BASE_URL}/v1/zones${qs.toString() ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as { total: number; zones: Zone[] };
  return data.zones;
}

export function createZone(payload: ZoneCreatePayload): Promise<Zone> {
  return json<Zone>(`${BASE_URL}/v1/zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateZone(id: number, payload: ZoneUpdatePayload): Promise<Zone> {
  return json<Zone>(`${BASE_URL}/v1/zones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteZone(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/v1/zones/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
}
