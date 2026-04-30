// Re-exported for backward compatibility. The real connection indicator
// now lives in AppHeader's ConnectionPill — this badge is no longer used
// in the new layout but is kept here so any external consumer keeps
// resolving the import.
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/client";

export function HealthBadge() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 2000,
  });

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-40)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-40)]" />
        connecting
      </span>
    );
  }
  if (isError || !data) {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--rose)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose)]" />
        backend offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--emerald)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" />
      backend v{data.version}
    </span>
  );
}
