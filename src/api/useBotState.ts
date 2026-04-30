import { useEffect, useState } from "react";
import { useStream } from "./StreamContext";
import type { BotTickEvent } from "./types";

const ACTIVE_STATES = new Set([
  "SCANNING",
  "FLYING_TO_WAYPOINT",
  "TRAIL_FOLLOWING",
  "INVESTIGATING",
  "APPROACHING_BASE",
  "CRUISING",
  "CLIMBING",
  "TAKING_OFF",
  "FLARING",
  "LANDING",
  "DESCENDING",
  "BARITONE_LANDING",
  "CIRCLING",
  "SAFE_DESCENDING",
  "REFUELING",
]);

const PAUSED_STATES = new Set(["PAUSED"]);

const OFFLINE_THRESHOLD_MS = 90_000;

export type BotPower = "ACTIVE" | "PAUSED" | "INACTIVE" | "OFFLINE";

export type BotState = {
  /** Latest bot_tick payload, or null. */
  latest: BotTickEvent | null;
  /** Coarse-grained power state. Drives the control panel CTA. */
  power: BotPower;
  /** Latest tick age in seconds. {@code Infinity} if no tick has arrived. */
  ageSeconds: number;
  /** True when {@code power === "ACTIVE"}. Convenience. */
  isActive: boolean;
  /** True when no tick has been received for > OFFLINE_THRESHOLD_MS. */
  isOffline: boolean;
};

/**
 * Derives a coarse "is the bot running ?" signal from the SSE stream of
 * bot_tick events. Re-renders every second so the "X s ago" stays fresh
 * even if no new tick arrives.
 */
export function useBotState(): BotState {
  const stream = useStream();
  const [, force] = useState(0);

  // Re-evaluate every second so age string ticks even with no new event.
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  let latest: BotTickEvent | null = null;
  for (let i = stream.events.length - 1; i >= 0; i--) {
    const e = stream.events[i];
    if (e.type === "bot_tick") {
      latest = e as BotTickEvent;
      break;
    }
  }

  const now = Date.now();
  const tsMs = latest?.ts_utc_ms ?? 0;
  const ageMs = latest ? now - tsMs : Number.POSITIVE_INFINITY;
  const ageSeconds = Math.max(0, Math.floor(ageMs / 1000));
  const isOffline = ageMs > OFFLINE_THRESHOLD_MS;

  let power: BotPower;
  if (isOffline) {
    power = "OFFLINE";
  } else if (latest && PAUSED_STATES.has(latest.flight_state)) {
    power = "PAUSED";
  } else if (latest && ACTIVE_STATES.has(latest.flight_state)) {
    power = "ACTIVE";
  } else {
    power = "INACTIVE";
  }

  return {
    latest,
    power,
    ageSeconds,
    isActive: power === "ACTIVE",
    isOffline,
  };
}

export function formatAge(seconds: number): string {
  if (!isFinite(seconds)) return "—";
  if (seconds < 1) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
