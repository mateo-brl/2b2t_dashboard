import { useEffect, useState } from "react";
import { fetchRecentEvents } from "../api/client";
import { useEventStream } from "../api/eventStream";
import type { BaseEvent } from "../api/types";

const CAP = 50;

function formatTime(tsMs: number): string {
  return new Date(tsMs).toLocaleTimeString();
}

function eventBadgeClass(type: string): string {
  switch (type) {
    case "base_found":
      return "bg-amber-500/20 text-amber-300 ring-amber-500/40";
    case "bot_tick":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    default:
      return "bg-zinc-700/40 text-zinc-300 ring-zinc-600/40";
  }
}

function summary(event: BaseEvent): string {
  if (event.type === "base_found") {
    return `${String(event.base_type)} @ chunk(${event.chunk_x},${event.chunk_z}) score ${Number(event.score).toFixed(1)}`;
  }
  if (event.type === "bot_tick") {
    const flying = event.flying ? "✈" : "·";
    return `${flying} y=${event.pos_y}  hp=${event.hp}  tps=${Number(event.tps).toFixed(1)}  chunks=${event.scanned_chunks}  bases=${event.bases_found}  ${event.flight_state}`;
  }
  return JSON.stringify(event);
}

function StreamPill({ status, count }: { status: string; count: number }) {
  const cls =
    status === "open"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
      : status === "connecting"
        ? "bg-zinc-700/40 text-zinc-300 ring-zinc-600/40"
        : "bg-red-500/15 text-red-300 ring-red-500/40";
  const label =
    status === "open" ? "live" : status === "connecting" ? "connecting" : "stream lost";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ring-1 ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label} · {count}
    </span>
  );
}

export function EventsList() {
  const [history, setHistory] = useState<BaseEvent[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const stream = useEventStream(CAP);

  // Initial fetch: populate the list with the last 50 events from the DB so
  // the user does not stare at an empty box waiting for the next live event.
  useEffect(() => {
    fetchRecentEvents(CAP)
      .then((res) => setHistory(res.events))
      .catch((e) => setHistoryError(String(e)));
  }, []);

  if (history === null && !historyError) return <p className="text-zinc-500">Loading…</p>;
  if (historyError && stream.events.length === 0) {
    return <p className="text-red-400">Error: {historyError}</p>;
  }

  // Merge history (REST snapshot) + live events (SSE), dedup by idempotency_key,
  // keep newest last (insertion order), then cap.
  const seen = new Set<string>();
  const merged: BaseEvent[] = [];
  for (const e of [...(history ?? []), ...stream.events]) {
    if (!seen.has(e.idempotency_key)) {
      seen.add(e.idempotency_key);
      merged.push(e);
    }
  }
  if (merged.length > CAP) merged.splice(0, merged.length - CAP);

  if (merged.length === 0) {
    return (
      <div className="space-y-2">
        <StreamPill status={stream.status} count={0} />
        <p className="text-zinc-500">
          No events yet. Start the bot with{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
            -Dbasefinder.backend.url=http://127.0.0.1:8080
          </code>
          .
        </p>
      </div>
    );
  }

  // Newest first
  const ordered = [...merged].reverse();

  return (
    <div className="space-y-2">
      <StreamPill status={stream.status} count={merged.length} />
      <ol className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/40">
        {ordered.map((e) => (
          <li
            key={e.idempotency_key}
            className="flex items-baseline gap-3 px-4 py-2 font-mono text-sm"
          >
            <span className="w-20 shrink-0 text-zinc-500">
              {formatTime(e.ts_utc_ms)}
            </span>
            <span
              className={`inline-flex w-24 shrink-0 justify-center rounded px-2 py-0.5 text-xs ring-1 ${eventBadgeClass(e.type)}`}
            >
              {e.type}
            </span>
            <span className="w-12 shrink-0 text-right text-zinc-500">#{e.seq}</span>
            <span className="flex-1 truncate text-zinc-300">{summary(e)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
