import { useEffect, useState } from "react";
import { fetchRecentEvents } from "../api/client";
import { useStream } from "../api/StreamContext";
import type { BaseEvent } from "../api/types";

const CAP = 50;

function formatTime(tsMs: number): string {
  const d = new Date(tsMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function eventAccent(type: string): string {
  switch (type) {
    case "base_found":
      return "text-[var(--amber)]";
    case "bot_tick":
      return "text-[var(--cyan)]";
    case "chunks_scanned_batch":
      return "text-[var(--emerald)]";
    default:
      return "text-[var(--text-40)]";
  }
}

function eventDot(type: string): string {
  switch (type) {
    case "base_found":
      return "bg-[var(--amber)]";
    case "bot_tick":
      return "bg-[var(--cyan)]";
    case "chunks_scanned_batch":
      return "bg-[var(--emerald)]";
    default:
      return "bg-[var(--text-40)]";
  }
}

function summary(event: BaseEvent): string {
  if (event.type === "base_found") {
    return `${String(event.base_type)} · score ${Number(event.score).toFixed(1)} · chunk(${event.chunk_x},${event.chunk_z})`;
  }
  if (event.type === "bot_tick") {
    const flying = event.flying ? "✈" : "·";
    return `${flying} ${event.flight_state} · y=${event.pos_y} hp=${event.hp} chunks=${(event.scanned_chunks as number).toLocaleString()}`;
  }
  if (event.type === "chunks_scanned_batch") {
    const arr = (event.chunks as number[]) ?? [];
    return `+${arr.length} chunks · ${event.dimension}`;
  }
  return JSON.stringify(event).slice(0, 80);
}

export function EventsList({ compact = false }: { compact?: boolean } = {}) {
  const [history, setHistory] = useState<BaseEvent[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const stream = useStream();

  useEffect(() => {
    fetchRecentEvents(CAP)
      .then((res) => setHistory(res.events))
      .catch((e) => setHistoryError(String(e)));
  }, []);

  if (history === null && !historyError) {
    return <p className="text-xs text-[var(--text-50)]">Loading…</p>;
  }
  if (historyError && stream.events.length === 0) {
    return (
      <p className="text-xs text-[var(--rose)]">Error: {historyError}</p>
    );
  }

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
      <p className="text-xs leading-relaxed text-[var(--text-50)]">
        No events yet. Start the bot with{" "}
        <code className="rounded-sm bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[11px] text-[var(--text-70)]">
          -Dbasefinder.backend.url=…
        </code>
      </p>
    );
  }

  const ordered = [...merged].reverse();

  if (compact) {
    return (
      <ol className="-mx-1 max-h-72 space-y-px overflow-y-auto pr-1">
        {ordered.map((e) => (
          <li
            key={e.idempotency_key}
            className="flex items-baseline gap-2 px-1 py-1 text-[12px] leading-snug"
          >
            <span
              aria-hidden
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${eventDot(e.type)}`}
            />
            <span className="w-[60px] shrink-0 font-mono tabular text-[var(--text-50)]">
              {formatTime(e.ts_utc_ms)}
            </span>
            <span
              className={`w-[68px] shrink-0 truncate ${eventAccent(e.type)}`}
            >
              {e.type === "base_found"
                ? "Base"
                : e.type === "bot_tick"
                  ? "Tick"
                  : e.type === "chunks_scanned_batch"
                    ? "Scan"
                    : e.type}
            </span>
            <span className="flex-1 truncate text-[var(--text-70)]">
              {summary(e)}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-2">
      <ol className="divide-y divide-[var(--line)] rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
        {ordered.map((e) => (
          <li
            key={e.idempotency_key}
            className="flex items-baseline gap-3 px-4 py-2 font-mono text-sm"
          >
            <span className="w-20 shrink-0 tabular text-[var(--text-40)]">
              {formatTime(e.ts_utc_ms)}
            </span>
            <span
              className={`inline-flex w-32 shrink-0 items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs ring-1 ring-[var(--line-strong)] ${eventAccent(e.type)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${eventDot(e.type)}`} />
              {e.type}
            </span>
            <span className="w-12 shrink-0 text-right tabular text-[var(--text-40)]">
              #{e.seq}
            </span>
            <span className="flex-1 truncate text-[var(--text-60)]">
              {summary(e)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
