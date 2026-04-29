import { useQuery } from "@tanstack/react-query";
import { fetchRecentEvents } from "../api/client";
import type { BaseEvent } from "../api/types";

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

export function EventsList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchRecentEvents(50),
    refetchInterval: 1000,
  });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;
  if (isError) return <p className="text-red-400">Error: {String(error)}</p>;

  const events = data?.events ?? [];
  if (events.length === 0) {
    return (
      <p className="text-zinc-500">
        No events yet. Start the bot with{" "}
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
          -Dbasefinder.backend.url=http://127.0.0.1:8080
        </code>
        .
      </p>
    );
  }

  // Newest first
  const ordered = [...events].reverse();

  return (
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
  );
}
