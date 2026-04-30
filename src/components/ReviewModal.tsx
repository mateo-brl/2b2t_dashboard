import { useCallback, useEffect, useMemo, useState } from "react";
import { useCombinedBases } from "../api/useCombinedBases";
import { useBotState } from "../api/useBotState";
import { postReview, type ReviewStatus } from "../api/reviews";
import { fetchScreenshotsForBase, type Screenshot } from "../api/screenshots";
import { useReview } from "../api/ReviewContext";
import type { BaseFoundEvent } from "../api/types";
import type { Dimension } from "../map/worldCoords";

const baseColor: Record<string, string> = {
  STASH: "#f59e0b",
  STORAGE: "#facc15",
  CONSTRUCTION: "#a78bfa",
  PORTAL: "#fb7185",
  MAP_ART: "#34d399",
  TRAIL: "#7dd3fc",
  FARM: "#86efac",
  CAVE_MINING: "#94a3b8",
};

function colorForType(type: string): string {
  return baseColor[type] ?? "var(--text-70)";
}

function formatCoords(b: BaseFoundEvent): string {
  const x = Math.round(Number(b.world_x ?? Number(b.chunk_x) * 16 + 8));
  const y = b.world_y ?? "?";
  const z = Math.round(Number(b.world_z ?? Number(b.chunk_z) * 16 + 8));
  return `${x.toLocaleString().replace(/,/g, " ")}, ${y}, ${z.toLocaleString().replace(/,/g, " ")}`;
}

function formatRelative(tsMs: number): string {
  const diff = Date.now() - tsMs;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function ActionButton({
  label,
  shortcut,
  tone,
  onClick,
  pending,
}: {
  label: string;
  shortcut: string;
  tone: "real" | "interesting" | "false" | "skip";
  onClick: () => void;
  pending: boolean;
}) {
  const cls = {
    real: "border-[var(--emerald)]/50 bg-[var(--emerald)]/10 text-[var(--emerald)] hover:bg-[var(--emerald)]/20",
    interesting:
      "border-[var(--cyan)]/50 bg-[var(--cyan)]/10 text-[var(--cyan)] hover:bg-[var(--cyan)]/20",
    false: "border-[var(--rose)]/50 bg-[var(--rose)]/10 text-[var(--rose)] hover:bg-[var(--rose)]/20",
    skip: "border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--text-70)] hover:bg-[var(--surface-3)]",
  }[tone];

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      <span>{label}</span>
      <kbd className="hidden rounded-sm border border-current/30 px-1.5 py-0.5 font-mono text-[10px] opacity-60 md:inline-block">
        {shortcut}
      </kbd>
    </button>
  );
}

/** Sub-component : carrousel of screenshots for one base. */
function ScreenshotCarousel({ baseKey }: { baseKey: string }) {
  const [shots, setShots] = useState<Screenshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setShots(null);
    setError(null);
    setIndex(0);
    fetchScreenshotsForBase(baseKey)
      .then((list) => {
        if (cancelled) return;
        setShots(list);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [baseKey]);

  if (error) {
    return (
      <div className="grid h-full place-items-center text-sm text-[var(--rose)]">
        Failed to load screenshots — {error}
      </div>
    );
  }
  if (shots === null) {
    return (
      <div className="grid h-full place-items-center text-sm text-[var(--text-50)]">
        Loading screenshots…
      </div>
    );
  }
  if (shots.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--text-50)]">
        No screenshots uploaded for this base yet. Either the bot didn't
        approach it (Visit bases is OFF) or the upload is still in flight.
      </div>
    );
  }

  const cur = shots[Math.min(index, shots.length - 1)];

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden bg-[var(--bg-deep)]">
        <img
          src={cur.url.startsWith("/")
            ? `${import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080"}${cur.url}`
            : cur.url}
          alt={`${baseKey} — ${cur.angle}`}
          className="h-full w-full object-contain"
        />
        <div className="absolute left-3 top-3 rounded-md border border-[var(--line-strong)] bg-[var(--bg-deep)]/85 px-2.5 py-1 text-xs text-[var(--text-100)] backdrop-blur">
          <span className="capitalize text-[var(--cyan)]">{cur.angle}</span>
          <span className="ml-2 text-[var(--text-50)]">
            {index + 1} / {shots.length}
          </span>
        </div>
        {shots.length > 1 && (
          <>
            <button
              onClick={() => setIndex((i) => (i - 1 + shots.length) % shots.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--line-strong)] bg-[var(--bg-deep)]/85 px-2 py-1 text-[var(--text-70)] backdrop-blur hover:text-[var(--text-100)]"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % shots.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--line-strong)] bg-[var(--bg-deep)]/85 px-2 py-1 text-[var(--text-70)] backdrop-blur hover:text-[var(--text-100)]"
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}
      </div>
      {shots.length > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-[var(--line)] bg-[var(--bg-deep)]/40 py-2">
          {shots.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-[var(--cyan)]"
                  : "w-1.5 bg-[var(--text-30)] hover:bg-[var(--text-50)]"
              }`}
              aria-label={`Go to ${s.angle}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewModal({ filterDim }: { filterDim: Dimension }) {
  const { modalOpen, closeModal, map, markLocally, selectedBaseKey, setSelectedBaseKey } = useReview();
  const bot = useBotState();

  // Combined source: live base_found events + ghost bases reconstructed
  // from base_reviews so previously-reviewed bases (whose event row may
  // have been deleted) are still navigable.
  const { bases } = useCombinedBases({ dim: filterDim, limit: 1000 });
  const [pendingAction, setPendingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PENDING bases for the active dimension, sorted by score desc.
  const pendingBases = useMemo(() => {
    return [...bases]
      .filter((b) => {
        const status = map.get(b.idempotency_key);
        return status === undefined || status === "PENDING";
      })
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  }, [bases, map]);

  // Track current base. If the user opened the modal on a specific key
  // (e.g. from the popup or the All-bases panel), we honour that key
  // even if the base is already reviewed (we want to let them browse
  // their notes / screenshots). Otherwise we surface the head of the
  // pending queue.
  const currentBase: BaseFoundEvent | null = useMemo(() => {
    if (selectedBaseKey != null) {
      const explicit = bases.find((b) => b.idempotency_key === selectedBaseKey);
      if (explicit) return explicit;
    }
    return pendingBases[0] ?? null;
  }, [bases, pendingBases, selectedBaseKey]);

  // Keep the selectedBaseKey aligned with whatever the queue is currently surfacing.
  useEffect(() => {
    if (modalOpen && currentBase && currentBase.idempotency_key !== selectedBaseKey) {
      setSelectedBaseKey(currentBase.idempotency_key);
    }
  }, [modalOpen, currentBase, selectedBaseKey, setSelectedBaseKey]);

  const submit = useCallback(
    async (status: ReviewStatus) => {
      if (!currentBase || pendingAction) return;
      const key = currentBase.idempotency_key;
      setPendingAction(true);
      setError(null);
      // Optimistic: drop from queue immediately.
      markLocally(key, status);
      try {
        await postReview(key, status);
      } catch (e) {
        setError(String(e));
        // Rollback: re-mark as PENDING so it reappears.
        markLocally(key, "PENDING");
      } finally {
        setPendingAction(false);
      }
      // Advance to the next base in the (stale) queue. The queue will
      // re-render due to map mutation and filter the just-reviewed one out.
      const nextIdx = pendingBases.findIndex((b) => b.idempotency_key === key) + 1;
      const next = pendingBases[nextIdx] ?? pendingBases[0] ?? null;
      setSelectedBaseKey(next?.idempotency_key ?? null);
    },
    [currentBase, pendingBases, pendingAction, markLocally, setSelectedBaseKey],
  );

  const skip = useCallback(() => {
    if (!currentBase) return;
    const idx = pendingBases.findIndex(
      (b) => b.idempotency_key === currentBase.idempotency_key,
    );
    const next = pendingBases[idx + 1] ?? pendingBases[0] ?? null;
    setSelectedBaseKey(next?.idempotency_key ?? null);
  }, [currentBase, pendingBases, setSelectedBaseKey]);

  const navigate = useCallback(
    (delta: 1 | -1) => {
      if (pendingBases.length === 0) return;
      const idx = pendingBases.findIndex(
        (b) => b.idempotency_key === currentBase?.idempotency_key,
      );
      const nextIdx = idx === -1 ? 0 : (idx + delta + pendingBases.length) % pendingBases.length;
      setSelectedBaseKey(pendingBases[nextIdx].idempotency_key);
    },
    [pendingBases, currentBase, setSelectedBaseKey],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "r":
          e.preventDefault();
          void submit("REAL");
          break;
        case "i":
          e.preventDefault();
          void submit("INTERESTING");
          break;
        case "f":
          e.preventDefault();
          void submit("FALSE_POSITIVE");
          break;
        case "s":
          e.preventDefault();
          skip();
          break;
        case "arrowleft":
          e.preventDefault();
          navigate(-1);
          break;
        case "arrowright":
          e.preventDefault();
          navigate(1);
          break;
        case "escape":
          e.preventDefault();
          closeModal();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen, submit, skip, navigate, closeModal]);

  if (!modalOpen) return null;

  const queueIndex =
    currentBase == null
      ? 0
      : Math.max(
          0,
          pendingBases.findIndex((b) => b.idempotency_key === currentBase.idempotency_key),
        );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full max-h-[920px] w-full max-w-[1400px] flex-col overflow-hidden rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg-deep)] px-6 py-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-semibold text-[var(--text-100)]">
              {currentBase && !pendingBases.find((b) => b.idempotency_key === currentBase.idempotency_key)
                ? "Review"
                : "Review queue"}
            </h2>
            <span className="text-sm text-[var(--text-50)]">
              {pendingBases.length === 0
                ? "no pending"
                : currentBase && !pendingBases.find((b) => b.idempotency_key === currentBase.idempotency_key)
                  ? `${pendingBases.length} pending elsewhere`
                  : `${queueIndex + 1} of ${pendingBases.length} pending`}
            </span>
            {bot.latest && (
              <span className="text-xs capitalize text-[var(--text-50)]">
                · {filterDim}
              </span>
            )}
          </div>
          <button
            onClick={closeModal}
            className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-70)] hover:bg-[var(--surface-3)] hover:text-[var(--text-100)]"
            aria-label="Close (Esc)"
          >
            Close · Esc
          </button>
        </header>

        {!currentBase ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
            <span className="text-3xl">🟢</span>
            <p className="text-base font-medium text-[var(--text-100)]">
              No pending bases for {filterDim}.
            </p>
            <p className="max-w-md text-sm text-[var(--text-50)]">
              Every detected base has been triaged. New ones will appear here as
              the bot finds them.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left : metadata + actions */}
            <div className="flex w-[360px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--bg-deep)]/30 p-5">
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xs uppercase tracking-wide text-[var(--text-50)]">
                      Type
                    </div>
                    {(() => {
                      const status = map.get(currentBase.idempotency_key);
                      if (!status || status === "PENDING") return null;
                      const color =
                        status === "REAL"
                          ? "var(--emerald)"
                          : status === "INTERESTING"
                            ? "var(--cyan)"
                            : "var(--text-50)";
                      const label =
                        status === "REAL"
                          ? "Real"
                          : status === "INTERESTING"
                            ? "Interesting"
                            : "False";
                      return (
                        <span
                          className="rounded-sm border px-2 py-0.5 text-[10px]"
                          style={{
                            color,
                            borderColor: `${color}66`,
                            background: `${color}1a`,
                          }}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                  <div
                    className="mt-1 text-2xl font-semibold capitalize"
                    style={{ color: colorForType(String(currentBase.base_type)) }}
                  >
                    {String(currentBase.base_type).toLowerCase().replace(/_/g, " ")}
                  </div>
                  {currentBase.ts_utc_ms === 0 && (
                    <div className="mt-1 text-[11px] italic text-[var(--text-50)]">
                      Reviewed orphan — base event no longer in DB.
                      Notes / screenshots preserved.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-[var(--surface-2)] p-3">
                    <div className="text-[11px] text-[var(--text-50)]">Score</div>
                    <div className="mt-0.5 font-mono tabular text-xl font-medium text-[var(--amber)]">
                      {Number(currentBase.score ?? 0).toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-md bg-[var(--surface-2)] p-3">
                    <div className="text-[11px] text-[var(--text-50)]">Found</div>
                    <div className="mt-0.5 text-sm text-[var(--text-100)]">
                      {formatRelative(currentBase.ts_utc_ms)}
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-[var(--surface-2)] p-3">
                  <div className="text-[11px] text-[var(--text-50)]">Coords</div>
                  <div className="mt-0.5 truncate font-mono tabular text-sm text-[var(--text-100)]">
                    {formatCoords(currentBase)}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[var(--text-50)]">
                    chunk ({currentBase.chunk_x}, {currentBase.chunk_z})
                    <span className="ml-2 capitalize">· {currentBase.dimension}</span>
                  </div>
                </div>

                <div className="rounded-md bg-[var(--surface-2)] p-3">
                  <div className="text-[11px] text-[var(--text-50)]">Idempotency key</div>
                  <div className="mt-0.5 break-all font-mono text-[11px] text-[var(--text-50)]">
                    {currentBase.idempotency_key}
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-[var(--rose)]/40 bg-[var(--rose)]/10 p-2 text-xs text-[var(--rose)]">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-2 pt-6">
                <ActionButton
                  label="Real base"
                  shortcut="R"
                  tone="real"
                  onClick={() => void submit("REAL")}
                  pending={pendingAction}
                />
                <ActionButton
                  label="Interesting"
                  shortcut="I"
                  tone="interesting"
                  onClick={() => void submit("INTERESTING")}
                  pending={pendingAction}
                />
                <ActionButton
                  label="False positive"
                  shortcut="F"
                  tone="false"
                  onClick={() => void submit("FALSE_POSITIVE")}
                  pending={pendingAction}
                />
                <ActionButton
                  label="Skip"
                  shortcut="S"
                  tone="skip"
                  onClick={skip}
                  pending={pendingAction}
                />
                <div className="flex items-center justify-between pt-2 text-[11px] text-[var(--text-50)]">
                  <span>← / → to navigate · Esc to close</span>
                </div>
              </div>
            </div>

            {/* Right : carousel */}
            <div className="flex-1">
              <ScreenshotCarousel baseKey={currentBase.idempotency_key} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
