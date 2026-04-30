import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/client";
import { useBotState, formatAge } from "../api/useBotState";

function ConnectionPill() {
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
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[var(--rose)] live-pulse" />
        backend offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--emerald)]">
      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[var(--emerald)] live-pulse" />
      backend
      <span className="text-[var(--text-40)]">v{data.version}</span>
      <span className="text-[var(--text-40)]">·</span>
      <span className="tabular text-[var(--text-60)]">
        {data.eventsStored.toLocaleString()} stored
      </span>
    </span>
  );
}

function StreamPill() {
  const bot = useBotState();
  const cls =
    bot.power === "ACTIVE"
      ? "text-[var(--cyan)]"
      : bot.power === "OFFLINE"
        ? "text-[var(--rose)]"
        : bot.power === "PAUSED"
          ? "text-[var(--amber)]"
          : "text-[var(--text-40)]";

  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] ${cls}`}
    >
      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current live-pulse" />
      bot
      <span className="text-[var(--text-40)]">{bot.power}</span>
      <span className="text-[var(--text-40)]">·</span>
      <span className="tabular text-[var(--text-60)]">
        {formatAge(bot.ageSeconds)}
      </span>
    </span>
  );
}

export function AppHeader() {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg-deep)]/60 px-5 backdrop-blur">
      {/* corner crosshair lines */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[var(--line-strong)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-[var(--line-strong)]"
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-sm border border-[var(--line-strong)] bg-[var(--surface-1)] font-mono text-[11px] text-[var(--emerald)]"
          >
            ◈
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-mono text-sm font-medium tracking-[0.22em] text-[var(--text-100)]">
              BASEFINDER
            </span>
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-40)]">
              survey · 2b2t.org
            </span>
          </div>
        </div>
        <span className="h-6 w-px bg-[var(--line)]" />
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-40)] md:inline">
          recon command
        </span>
      </div>

      <div className="flex items-center gap-5">
        <ConnectionPill />
        <span className="h-4 w-px bg-[var(--line)]" />
        <StreamPill />
      </div>
    </header>
  );
}
