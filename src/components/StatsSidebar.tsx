import { useQuery } from "@tanstack/react-query";
import { useBotState } from "../api/useBotState";
import { listZones } from "../api/zones";
import { BotControlPanel } from "./BotControlPanel";
import { EventsList } from "./EventsList";

function Section({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-[var(--line-strong)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-[var(--line-strong)]"
      />
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-40)]">
          {label}
        </span>
        {meta && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-25)]">
            {meta}
          </span>
        )}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function tpsTone(tps: number | undefined): { color: string; label: string } {
  if (tps === undefined) return { color: "text-[var(--text-40)]", label: "—" };
  if (tps >= 18) return { color: "text-[var(--emerald)]", label: tps.toFixed(1) };
  if (tps >= 12) return { color: "text-[var(--amber)]", label: tps.toFixed(1) };
  return { color: "text-[var(--rose)]", label: tps.toFixed(1) };
}

function hpTone(hp: number | undefined): string {
  if (hp === undefined) return "bg-[var(--text-40)]";
  if (hp >= 16) return "bg-[var(--emerald)]";
  if (hp >= 8) return "bg-[var(--amber)]";
  return "bg-[var(--rose)]";
}

function PositionBlock() {
  const bot = useBotState();
  const t = bot.latest;
  const dim = t?.dimension ?? "—";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-40)]">
          coords
        </span>
        <span className="rounded-sm border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--text-60)]">
          {dim}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 font-mono">
        {(["x", "y", "z"] as const).map((axis, i) => {
          const value = t
            ? axis === "x"
              ? t.pos_x
              : axis === "y"
                ? t.pos_y
                : t.pos_z
            : null;
          return (
            <div key={axis} className="rounded-sm bg-[var(--surface-2)]/60 p-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
                {axis}
              </div>
              <div
                className={`mt-1 truncate font-display text-base font-medium tabular ${
                  i === 1
                    ? "text-[var(--cyan)]"
                    : "text-[var(--text-100)]"
                }`}
              >
                {value === null
                  ? "—"
                  : Math.round(value).toLocaleString().replace(/,/g, " ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VitalsGrid() {
  const bot = useBotState();
  const t = bot.latest;
  const tps = tpsTone(t?.tps);
  const hp = t?.hp;
  const hpPct = hp !== undefined ? Math.max(0, Math.min(100, (hp / 20) * 100)) : 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* HP */}
      <div className="rounded-sm bg-[var(--surface-2)]/60 p-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
            hp
          </span>
          <span className="font-mono text-[10px] tabular text-[var(--text-60)]">
            {hp ?? "—"}/20
          </span>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className={`h-full transition-all duration-500 ${hpTone(hp)}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {/* TPS */}
      <div className="rounded-sm bg-[var(--surface-2)]/60 p-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
            tps
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
              tps.color
            }`}
          >
            {(t?.tps ?? 0) >= 18
              ? "stable"
              : (t?.tps ?? 0) >= 12
                ? "lag"
                : t
                  ? "severe"
                  : "—"}
          </span>
        </div>
        <div className={`mt-1 font-display text-xl font-medium tabular ${tps.color}`}>
          {tps.label}
        </div>
      </div>

      {/* Scanned */}
      <div className="rounded-sm bg-[var(--surface-2)]/60 p-2.5">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
          chunks scanned
        </div>
        <div className="mt-1 font-display text-xl font-medium tabular text-[var(--text-100)]">
          {t ? t.scanned_chunks.toLocaleString().replace(/,/g, " ") : "—"}
        </div>
      </div>

      {/* Bases */}
      <div className="rounded-sm bg-[var(--surface-2)]/60 p-2.5">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
          bases found
        </div>
        <div className="mt-1 font-display text-xl font-medium tabular text-[var(--amber)]">
          {t ? t.bases_found.toLocaleString().replace(/,/g, " ") : "—"}
        </div>
      </div>
    </div>
  );
}

function FlightStateRow() {
  const bot = useBotState();
  const state = bot.latest?.flight_state ?? "OFFLINE";
  const flying = bot.latest?.flying ?? false;
  return (
    <div className="flex items-center justify-between rounded-sm border border-[var(--line)] bg-[var(--surface-2)]/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
          phase
        </span>
        <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--text-100)]">
          {state}
        </span>
      </div>
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          flying ? "text-[var(--cyan)]" : "text-[var(--text-25)]"
        }`}
      >
        {flying ? "✈ flying" : "· grounded"}
      </span>
    </div>
  );
}

function WaypointsRow() {
  const bot = useBotState();
  const t = bot.latest;
  const idx = t?.wp_index ?? 0;
  const total = t?.wp_total ?? 0;
  const pct = total > 0 ? Math.min(100, ((idx + 1) / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
          waypoints
        </span>
        <span className="font-mono text-[11px] tabular text-[var(--text-60)]">
          <span className="text-[var(--text-100)]">
            {total > 0 ? idx + 1 : 0}
          </span>
          <span className="text-[var(--text-40)]"> / {total}</span>
        </span>
      </div>
      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className="h-full bg-[var(--cyan)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ZonesRow() {
  const bot = useBotState();
  const dim = bot.latest?.dimension ?? "overworld";
  const { data } = useQuery({
    queryKey: ["zones", dim],
    queryFn: () => listZones(dim),
    refetchInterval: 5000,
  });
  const total = data?.length ?? 0;
  const active = data?.filter((z) => z.active).length ?? 0;

  return (
    <div className="flex items-center justify-between rounded-sm border border-[var(--line)] bg-[var(--surface-2)]/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-40)]">
          search zones
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-25)]">
          {dim}
        </span>
      </div>
      <span className="font-mono text-[11px] tabular">
        <span
          className={
            active > 0
              ? "text-[var(--emerald)]"
              : "text-[var(--text-40)]"
          }
        >
          {active} active
        </span>
        <span className="text-[var(--text-25)]"> · </span>
        <span className="text-[var(--text-40)]">{total} total</span>
      </span>
    </div>
  );
}

export function StatsSidebar() {
  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col border-l border-[var(--line)] bg-[var(--bg-deep)]/40">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-40)]">
          telemetry · live
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-25)]">
          1 hz
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <BotControlPanel />

        <Section label="player position" meta="snapshot">
          <PositionBlock />
        </Section>

        <Section label="vitals">
          <div className="space-y-3">
            <VitalsGrid />
            <FlightStateRow />
          </div>
        </Section>

        <Section label="navigation">
          <div className="space-y-3">
            <WaypointsRow />
            <ZonesRow />
          </div>
        </Section>

        <Section label="event log" meta="last 50">
          <EventsList compact />
        </Section>
      </div>
    </aside>
  );
}
