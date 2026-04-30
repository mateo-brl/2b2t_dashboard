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
      <span className="inline-flex items-center gap-2 text-sm text-[var(--text-50)]">
        <span className="h-2 w-2 rounded-full bg-[var(--text-50)]" />
        Connecting…
      </span>
    );
  }
  if (isError || !data) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-[var(--rose)]">
        <span className="h-2 w-2 rounded-full bg-[var(--rose)]" />
        Backend offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="h-2 w-2 rounded-full bg-[var(--emerald)]" />
      <span className="text-[var(--text-100)]">Backend</span>
      <span className="font-mono text-xs text-[var(--text-50)]">
        v{data.version}
      </span>
      <span className="font-mono tabular text-xs text-[var(--text-50)]">
        · {data.eventsStored.toLocaleString()} stored
      </span>
    </span>
  );
}

function StreamPill() {
  const bot = useBotState();
  const color =
    bot.power === "ACTIVE"
      ? "var(--emerald)"
      : bot.power === "OFFLINE"
        ? "var(--rose)"
        : bot.power === "PAUSED"
          ? "var(--amber)"
          : "var(--text-50)";

  const label =
    bot.power === "ACTIVE"
      ? "Active"
      : bot.power === "PAUSED"
        ? "Paused"
        : bot.power === "OFFLINE"
          ? "Offline"
          : "Idle";

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[var(--text-100)]">Bot</span>
      <span className="text-[var(--text-50)]" style={{ color }}>
        {label}
      </span>
      <span className="font-mono tabular text-xs text-[var(--text-50)]">
        · {bot.latest ? formatAge(bot.ageSeconds) : "no data"}
      </span>
    </span>
  );
}

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg-deep)] px-5">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-[var(--text-100)]">
          BaseFinder
        </h1>
        <span className="text-xs text-[var(--text-50)]">
          Live telemetry · 2b2t
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
