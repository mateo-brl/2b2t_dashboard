import { createContext, useContext, type ReactNode } from "react";
import { useEventStream, type StreamState } from "./eventStream";

const StreamContext = createContext<StreamState | null>(null);

/**
 * Provider that opens a single SSE connection at the App root and exposes
 * the resulting stream state to all consumers. Avoids the otherwise easy
 * mistake of opening one EventSource per component that calls
 * {@link useEventStream}.
 */
export function StreamProvider({
  cap = 200,
  children,
}: {
  cap?: number;
  children: ReactNode;
}) {
  const state = useEventStream(cap);
  return <StreamContext.Provider value={state}>{children}</StreamContext.Provider>;
}

export function useStream(): StreamState {
  const ctx = useContext(StreamContext);
  if (!ctx) throw new Error("useStream must be used inside <StreamProvider>");
  return ctx;
}
