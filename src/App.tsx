import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StreamProvider } from "./api/StreamContext";
import { HealthBadge } from "./components/HealthBadge";
import { EventsList } from "./components/EventsList";
import { BasesMap } from "./components/BasesMap";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 500, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StreamProvider cap={200}>
        <div className="min-h-screen px-6 py-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <header className="flex items-baseline justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-zinc-100">
                  BaseFinder · live telemetry
                </h1>
                <p className="text-sm text-zinc-500">
                  Live stream of bot events + map of detected bases.
                </p>
              </div>
              <HealthBadge />
            </header>

            <section>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Map
              </h2>
              <BasesMap />
            </section>

            <section>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Recent events
              </h2>
              <EventsList />
            </section>
          </div>
        </div>
      </StreamProvider>
    </QueryClientProvider>
  );
}
