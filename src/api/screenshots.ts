const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type Screenshot = {
  id: number;
  baseKey: string;
  angle: string;
  takenAtMs: number;
  receivedAt: number;
  url: string; // relative path "/v1/screenshots/{id}/raw"
};

export function rawScreenshotUrl(id: number): string {
  return `${BASE_URL}/v1/screenshots/${id}/raw`;
}

export async function fetchScreenshotsForBase(
  baseKey: string,
): Promise<Screenshot[]> {
  const qs = new URLSearchParams({ base_key: baseKey });
  const res = await fetch(`${BASE_URL}/v1/screenshots?${qs}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as { total: number; screenshots: Screenshot[] };
  // Sort by canonical angle order (aerial → ground → detail) so the
  // carousel reads naturally regardless of upload order.
  const order = ["aerial", "ground", "detail"];
  return data.screenshots.sort(
    (a, b) =>
      (order.indexOf(a.angle) === -1 ? 99 : order.indexOf(a.angle)) -
      (order.indexOf(b.angle) === -1 ? 99 : order.indexOf(b.angle)),
  );
}
