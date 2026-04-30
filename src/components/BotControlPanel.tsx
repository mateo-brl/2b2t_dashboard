import { useState } from "react";
import { postCommand, type CommandType } from "../api/commands";
import { useBotState, formatAge } from "../api/useBotState";

type Status = "idle" | "sending" | "error";

const POWER_COLOR: Record<string, string> = {
  ACTIVE: "text-[var(--emerald)]",
  PAUSED: "text-[var(--amber)]",
  INACTIVE: "text-[var(--text-40)]",
  OFFLINE: "text-[var(--rose)]",
};

const POWER_BAR: Record<string, string> = {
  ACTIVE: "bg-[var(--emerald)]",
  PAUSED: "bg-[var(--amber)]",
  INACTIVE: "bg-[var(--text-40)]",
  OFFLINE: "bg-[var(--rose)]",
};

function ActionButton({
  label,
  onClick,
  disabled,
  tone = "neutral",
  pending,
  hint,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "warn" | "danger";
  pending?: boolean;
  hint?: string;
}) {
  const toneCls =
    tone === "primary"
      ? "border-[var(--emerald)]/50 bg-[var(--emerald)]/10 text-[var(--emerald)] hover:bg-[var(--emerald)]/15 hover:border-[var(--emerald)]/70"
      : tone === "warn"
        ? "border-[var(--amber)]/40 bg-[var(--amber)]/8 text-[var(--amber)] hover:bg-[var(--amber)]/12 hover:border-[var(--amber)]/60"
        : tone === "danger"
          ? "border-[var(--rose)]/45 bg-[var(--rose)]/10 text-[var(--rose)] hover:bg-[var(--rose)]/15 hover:border-[var(--rose)]/65"
          : "border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--text-60)] hover:text-[var(--text-100)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-3)]";
  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      title={hint}
      className={`group inline-flex h-9 items-center justify-center gap-2 rounded-sm border font-mono text-[11px] uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneCls}`}
    >
      <span>{pending ? "…" : label}</span>
    </button>
  );
}

export function BotControlPanel() {
  const bot = useBotState();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);

  async function send(type: CommandType) {
    setStatus("sending");
    setError(null);
    try {
      await postCommand(type);
    } catch (e) {
      setError(String(e));
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1500);
      return;
    }
    setStatus("idle");
  }

  const power = bot.power;
  const offline = power === "OFFLINE";

  return (
    <section className="relative overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
      {/* corner ticks */}
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
          bot control
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-25)]">
          /v1/commands
        </span>
      </header>

      <div className="px-4 pb-4 pt-3">
        {/* state line */}
        <div className="mb-3 flex items-end justify-between">
          <div className="flex items-baseline gap-3">
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-40)]`}
            >
              status
            </span>
            <span
              className={`font-display text-2xl font-medium tracking-tight tabular ${POWER_COLOR[power]}`}
            >
              {power}
            </span>
          </div>
          <span className="font-mono text-[11px] tabular text-[var(--text-40)]">
            {bot.latest ? formatAge(bot.ageSeconds) : "—"}
          </span>
        </div>

        {/* state bar */}
        <div
          className={`relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--surface-3)]`}
        >
          <div
            className={`h-full transition-all duration-700 ${POWER_BAR[power]}`}
            style={{
              width:
                power === "ACTIVE"
                  ? "100%"
                  : power === "PAUSED"
                    ? "60%"
                    : power === "OFFLINE"
                      ? "100%"
                      : "10%",
            }}
          />
          {power === "ACTIVE" && (
            <div className="absolute inset-0 scan-line opacity-80" aria-hidden />
          )}
        </div>

        {/* primary CTA */}
        <div className="mt-4">
          {confirmStop ? (
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="confirm stop"
                tone="danger"
                onClick={async () => {
                  await send("basefinder.disable");
                  setConfirmStop(false);
                }}
                pending={status === "sending"}
              />
              <ActionButton
                label="cancel"
                onClick={() => setConfirmStop(false)}
              />
            </div>
          ) : power === "ACTIVE" || power === "PAUSED" ? (
            <ActionButton
              label="stop basehunter"
              tone="danger"
              hint="Disables the BaseHunter module on the bot."
              onClick={() => setConfirmStop(true)}
              disabled={offline}
            />
          ) : (
            <ActionButton
              label="start basehunter"
              tone="primary"
              hint="Enables the BaseHunter module on the bot."
              onClick={() => send("basefinder.enable")}
              disabled={offline}
              pending={status === "sending"}
            />
          )}
        </div>

        {/* secondary controls */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <ActionButton
            label="pause"
            tone="warn"
            disabled={offline || power !== "ACTIVE"}
            pending={status === "sending"}
            onClick={() => send("basefinder.pause")}
          />
          <ActionButton
            label="resume"
            tone="primary"
            disabled={offline || power !== "PAUSED"}
            pending={status === "sending"}
            onClick={() => send("basefinder.resume")}
          />
          <ActionButton
            label="skip wp"
            disabled={offline || power !== "ACTIVE"}
            pending={status === "sending"}
            onClick={() => send("basefinder.skip")}
          />
        </div>

        {error && (
          <p className="mt-3 font-mono text-[11px] text-[var(--rose)]">{error}</p>
        )}

        <p className="mt-3 font-mono text-[10px] leading-relaxed text-[var(--text-25)]">
          Commands are queued server-side. The bot polls{" "}
          <span className="text-[var(--text-40)]">/v1/commands</span> every 2s and acks once executed.
        </p>
      </div>
    </section>
  );
}
