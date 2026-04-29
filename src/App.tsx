import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HealthBadge } from "./components/HealthBadge";
import { EventsList } from "./components/EventsList";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 500, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">
                BaseFinder · live telemetry
              </h1>
              <p className="text-sm text-zinc-500">
                Phase 2 dashboard — read-only stream of bot events.
              </p>
            </div>
            <HealthBadge />
          </header>

          <section>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Recent events
            </h2>
            <EventsList />
          </section>
        </div>
      </div>
    </QueryClientProvider>
  );
}
