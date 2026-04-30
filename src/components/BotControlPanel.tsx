import { useState } from "react";
import { postCommand, type CommandType } from "../api/commands";
import { useBotState, formatAge } from "../api/useBotState";

type Status = "idle" | "sending" | "error";

const POWER_TEXT: Record<string, string> = {
  ACTIVE: "text-[var(--emerald)]",
  PAUSED: "text-[var(--amber)]",
  INACTIVE: "text-[var(--text-70)]",
  OFFLINE: "text-[var(--rose)]",
};

const POWER_BAR: Record<string, string> = {
  ACTIVE: "bg-[var(--emerald)]",
  PAUSED: "bg-[var(--amber)]",
  INACTIVE: "bg-[var(--text-30)]",
  OFFLINE: "bg-[var(--rose)]",
};

const POWER_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  INACTIVE: "Idle",
  OFFLINE: "Offline",
};

function Btn({
  label,
  onClick,
  disabled,
  tone = "neutral",
  pending,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "warn" | "danger";
  pending?: boolean;
}) {
  const cls =
    tone === "primary"
      ? "border-[var(--emerald)]/50 bg-[var(--emerald)]/10 text-[var(--emerald)] hover:bg-[var(--emerald)]/15"
      : tone === "warn"
        ? "border-[var(--amber)]/40 bg-[var(--amber)]/10 text-[var(--amber)] hover:bg-[var(--amber)]/15"
        : tone === "danger"
          ? "border-[var(--rose)]/45 bg-[var(--rose)]/10 text-[var(--rose)] hover:bg-[var(--rose)]/15"
          : "border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--text-70)] hover:bg-[var(--surface-3)] hover:text-[var(--text-100)]";
  return (
    <button
      onClick={onClick}
      disabled={disabled || pending}
      className={`inline-flex h-9 items-center justify-center rounded-md border text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {pending ? "…" : label}
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
    <section className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--text-100)]">
          Bot control
        </span>
        <span className="text-xs text-[var(--text-50)]">
          {bot.latest ? formatAge(bot.ageSeconds) : "no signal"}
        </span>
      </header>

      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-xs text-[var(--text-50)]">Status</span>
          <span className={`text-lg font-semibold ${POWER_TEXT[power]}`}>
            {POWER_LABEL[power]}
          </span>
        </div>

        <div className="h-[2px] w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className={`h-full transition-all duration-500 ${POWER_BAR[power]}`}
            style={{
              width:
                power === "ACTIVE"
                  ? "100%"
                  : power === "PAUSED"
                    ? "55%"
                    : power === "OFFLINE"
                      ? "100%"
                      : "10%",
            }}
          />
        </div>

        <div className="mt-4">
          {confirmStop ? (
            <div className="grid grid-cols-2 gap-2">
              <Btn
                label="Confirm stop"
                tone="danger"
                onClick={async () => {
                  await send("basefinder.disable");
                  setConfirmStop(false);
                }}
                pending={status === "sending"}
              />
              <Btn label="Cancel" onClick={() => setConfirmStop(false)} />
            </div>
          ) : power === "ACTIVE" || power === "PAUSED" ? (
            <Btn
              label="Stop BaseHunter"
              tone="danger"
              onClick={() => setConfirmStop(true)}
              disabled={offline}
            />
          ) : (
            <Btn
              label="Start BaseHunter"
              tone="primary"
              onClick={() => send("basefinder.enable")}
              disabled={offline}
              pending={status === "sending"}
            />
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Btn
            label="Pause"
            tone="warn"
            disabled={offline || power !== "ACTIVE"}
            pending={status === "sending"}
            onClick={() => send("basefinder.pause")}
          />
          <Btn
            label="Resume"
            tone="primary"
            disabled={offline || power !== "PAUSED"}
            pending={status === "sending"}
            onClick={() => send("basefinder.resume")}
          />
          <Btn
            label="Skip wp"
            disabled={offline || power !== "ACTIVE"}
            pending={status === "sending"}
            onClick={() => send("basefinder.skip")}
          />
        </div>

        {error && (
          <p className="mt-3 text-xs text-[var(--rose)]">{error}</p>
        )}
      </div>
    </section>
  );
}
