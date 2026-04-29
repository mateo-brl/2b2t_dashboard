import type { EventsResponse, HealthResponse } from "./types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/v1/health");
}

export function fetchRecentEvents(limit = 50): Promise<EventsResponse> {
  return request<EventsResponse>(`/v1/events?limit=${limit}`);
}
