import { useEffect, useRef, useState } from "react";
import type { BaseEvent } from "./types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

export type StreamStatus = "connecting" | "open" | "error";

export type StreamState = {
  events: BaseEvent[];
  status: StreamStatus;
};

/**
 * Subscribe to /v1/events/stream and keep the last `cap` events in state.
 * Intended to be called once at the page level.
 *
 * Behaviour:
 * - On open, status flips to "open".
 * - Each SSE message is parsed as a BaseEvent and appended (newest last).
 * - List is capped at `cap` to bound memory.
 * - EventSource auto-reconnects on transient network failures (browser
 *   default). On a hard error the status flips to "error" but we keep
 *   whatever events we already had.
 *
 * For the historical fetch on first paint, see {@link useInitialEvents}.
 */
export function useEventStream(cap = 50): StreamState {
  const [state, setState] = useState<StreamState>({
    events: [],
    status: "connecting",
  });
  // React StrictMode double-invokes effects in dev. Without a ref guard we
  // would open two EventSources at once, racing each other and the cleanup,
  // which makes the "open" event handler appear silent on screen.
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (sourceRef.current) return;
    const url = `${BASE_URL}/v1/events/stream`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setState((s) => ({ ...s, status: "open" }));
    };

    const handleEvent = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as BaseEvent;
        setState((s) => {
          const next = [...s.events, event];
          if (next.length > cap) next.splice(0, next.length - cap);
          return { events: next, status: "open" };
        });
      } catch {
        // Malformed payload — backend should never send these, but stay
        // resilient: drop the message and keep the stream alive.
      }
    };
    source.addEventListener("event", handleEvent as EventListener);
    source.onmessage = handleEvent;

    source.onerror = () => {
      // EventSource auto-reconnects; only flag "error" once readyState confirms
      // a hard close.
      if (source.readyState === EventSource.CLOSED) {
        setState((s) => ({ ...s, status: "error" }));
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [cap]);

  return state;
}
