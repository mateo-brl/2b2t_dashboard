import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StreamProvider } from "./api/StreamContext";
import { ReviewProvider } from "./api/ReviewContext";
import { AppHeader } from "./components/AppHeader";
import { BasesMap } from "./components/BasesMap";
import { StatsSidebar } from "./components/StatsSidebar";
import { ReviewModalHost } from "./components/ReviewModalHost";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 500, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StreamProvider cap={200}>
        <ReviewProvider>
          <div className="flex h-screen flex-col bg-transparent">
            <AppHeader />
            <main className="flex flex-1 overflow-hidden">
              {/* Map column */}
              <div className="relative flex-1 border-r border-[var(--line)]">
                <BasesMap />
              </div>

              {/* Stats sidebar */}
              <StatsSidebar />
            </main>
            <ReviewModalHost />
          </div>
        </ReviewProvider>
      </StreamProvider>
    </QueryClientProvider>
  );
}
