import { useQuery } from "@tanstack/react-query";
import { useBotState } from "../api/useBotState";
import { listZones } from "../api/zones";
import { BotControlPanel } from "./BotControlPanel";
import { EventsList } from "./EventsList";
import { ReviewSidebarCard } from "./ReviewSidebarCard";

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--text-100)]">{title}</span>
        {meta && <span className="text-xs text-[var(--text-50)]">{meta}</span>}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function tpsTone(tps: number | undefined): { color: string; label: string } {
  if (tps === undefined) return { color: "text-[var(--text-50)]", label: "—" };
  if (tps >= 18) return { color: "text-[var(--emerald)]", label: tps.toFixed(1) };
  if (tps >= 12) return { color: "text-[var(--amber)]", label: tps.toFixed(1) };
  return { color: "text-[var(--rose)]", label: tps.toFixed(1) };
}

function hpTone(hp: number | undefined): string {
  if (hp === undefined) return "bg-[var(--text-30)]";
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
        <span className="text-xs text-[var(--text-50)]">Coords</span>
        <span className="rounded-sm bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] capitalize text-[var(--text-70)]">
          {dim}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["x", "y", "z"] as const).map((axis, i) => {
          const value = t
            ? axis === "x"
              ? t.pos_x
              : axis === "y"
                ? t.pos_y
                : t.pos_z
            : null;
          return (
            <div
              key={axis}
              className="rounded-sm bg-[var(--surface-2)] p-2"
            >
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-50)]">
                {axis}
              </div>
              <div
                className={`mt-1 truncate font-mono tabular text-[15px] font-medium ${
                  i === 1 ? "text-[var(--cyan)]" : "text-[var(--text-100)]"
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
      <div className="rounded-sm bg-[var(--surface-2)] p-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-[var(--text-50)]">HP</span>
          <span className="font-mono tabular text-[11px] text-[var(--text-70)]">
            {hp ?? "—"} / 20
          </span>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className={`h-full transition-all duration-500 ${hpTone(hp)}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      <div className="rounded-sm bg-[var(--surface-2)] p-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-[var(--text-50)]">TPS</span>
          <span className={`text-[11px] ${tps.color}`}>
            {(t?.tps ?? 0) >= 18
              ? "stable"
              : (t?.tps ?? 0) >= 12
                ? "lag"
                : t
                  ? "severe"
                  : "—"}
          </span>
        </div>
        <div className={`mt-1 font-mono tabular text-[18px] font-medium ${tps.color}`}>
          {tps.label}
        </div>
      </div>

      <div className="rounded-sm bg-[var(--surface-2)] p-2.5">
        <div className="text-[11px] text-[var(--text-50)]">Chunks scanned</div>
        <div className="mt-1 font-mono tabular text-[18px] font-medium text-[var(--text-100)]">
          {t ? t.scanned_chunks.toLocaleString().replace(/,/g, " ") : "—"}
        </div>
      </div>

      <div className="rounded-sm bg-[var(--surface-2)] p-2.5">
        <div className="text-[11px] text-[var(--text-50)]">Bases found</div>
        <div className="mt-1 font-mono tabular text-[18px] font-medium text-[var(--amber)]">
          {t ? t.bases_found.toLocaleString().replace(/,/g, " ") : "—"}
        </div>
      </div>
    </div>
  );
}

function FlightStateRow() {
  const bot = useBotState();
  const state = bot.latest?.flight_state ?? "Offline";
  const flying = bot.latest?.flying ?? false;
  return (
    <div className="flex items-center justify-between rounded-sm bg-[var(--surface-2)] px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] text-[var(--text-50)]">Phase</span>
        <span className="font-mono text-[12px] text-[var(--text-100)]">
          {state.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>
      <span
        className={`text-[11px] ${flying ? "text-[var(--cyan)]" : "text-[var(--text-50)]"}`}
      >
        {flying ? "flying" : "grounded"}
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
        <span className="text-[11px] text-[var(--text-50)]">Waypoints</span>
        <span className="font-mono tabular text-[12px]">
          <span className="text-[var(--text-100)]">{total > 0 ? idx + 1 : 0}</span>
          <span className="text-[var(--text-50)]"> / {total}</span>
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
    <div className="flex items-center justify-between rounded-sm bg-[var(--surface-2)] px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] text-[var(--text-50)]">Search zones</span>
        <span className="text-[11px] capitalize text-[var(--text-50)]">{dim}</span>
      </div>
      <span className="font-mono tabular text-[12px]">
        <span
          className={
            active > 0 ? "text-[var(--emerald)]" : "text-[var(--text-50)]"
          }
        >
          {active} active
        </span>
        <span className="text-[var(--text-30)]"> · </span>
        <span className="text-[var(--text-50)]">{total} total</span>
      </span>
    </div>
  );
}

export function StatsSidebar() {
  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-[var(--line)] bg-[var(--bg-deep)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
        <span className="text-sm font-medium text-[var(--text-100)]">
          Telemetry
        </span>
        <span className="text-xs text-[var(--text-50)]">Live · 1 Hz</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <BotControlPanel />

        <ReviewSidebarCard />

        <Section title="Position">
          <PositionBlock />
        </Section>

        <Section title="Vitals">
          <div className="space-y-3">
            <VitalsGrid />
            <FlightStateRow />
          </div>
        </Section>

        <Section title="Navigation">
          <div className="space-y-3">
            <WaypointsRow />
            <ZonesRow />
          </div>
        </Section>

        <Section title="Events" meta="Last 50">
          <EventsList compact />
        </Section>
      </div>
    </aside>
  );
}
