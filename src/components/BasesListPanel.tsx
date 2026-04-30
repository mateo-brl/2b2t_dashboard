import { useEffect, useMemo, useState } from "react";
import { useCombinedBases } from "../api/useCombinedBases";
import { useReview } from "../api/ReviewContext";
import { fetchReview, postReview, type Review, type ReviewStatus } from "../api/reviews";
import type { BaseFoundEvent } from "../api/types";
import { DIMENSIONS, type Dimension } from "../map/worldCoords";

type SortKey = "score" | "found" | "type";
type SortDir = "asc" | "desc";

type StatusFilter = "all" | "pending" | ReviewStatus;

const STATUS_LABEL: Record<ReviewStatus | "PENDING", string> = {
  PENDING: "Pending",
  REAL: "Real",
  FALSE_POSITIVE: "False",
  INTERESTING: "Interesting",
};

const STATUS_COLOR: Record<ReviewStatus | "PENDING", string> = {
  PENDING: "var(--amber)",
  REAL: "var(--emerald)",
  FALSE_POSITIVE: "var(--text-50)",
  INTERESTING: "var(--cyan)",
};

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

function relativeTime(tsMs: number): string {
  const diff = Date.now() - tsMs;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function NotesCell({
  baseKey,
  initialNotes,
  currentStatus,
  onSaved,
}: {
  baseKey: string;
  initialNotes: string;
  currentStatus: ReviewStatus | "PENDING";
  onSaved: (notes: string) => void;
}) {
  const [value, setValue] = useState(initialNotes);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialNotes);
  }, [initialNotes]);

  const save = async () => {
    if (saving) return;
    if (value === initialNotes) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Upsert review with same status (or PENDING) + new notes.
      const status: ReviewStatus = currentStatus === "PENDING" ? "PENDING" : currentStatus;
      await postReview(baseKey, status, value.trim() || undefined);
      onSaved(value.trim());
      setEditing(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-stretch gap-1">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              setValue(initialNotes);
              setEditing(false);
            }
          }}
          rows={2}
          className="flex-1 rounded-sm border border-[var(--cyan)]/40 bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-100)] outline-none"
          placeholder="Add a note…"
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-sm border border-[var(--emerald)]/40 bg-[var(--emerald)]/10 px-2 py-0.5 text-[10px] text-[var(--emerald)] hover:bg-[var(--emerald)]/20 disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            onClick={() => {
              setValue(initialNotes);
              setEditing(false);
            }}
            className="rounded-sm border border-[var(--line-strong)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-50)] hover:text-[var(--text-100)]"
          >
            Esc
          </button>
        </div>
        {error && <span className="text-[10px] text-[var(--rose)]">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="block w-full max-w-[260px] truncate rounded-sm px-2 py-1 text-left text-xs text-[var(--text-70)] hover:bg-[var(--surface-2)] hover:text-[var(--text-100)]"
      title={initialNotes || "Click to add a note"}
    >
      {initialNotes || (
        <span className="italic text-[var(--text-30)]">add note…</span>
      )}
    </button>
  );
}

function StatusPill({ status }: { status: ReviewStatus | "PENDING" }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px]"
      style={{
        color,
        borderColor: `${color}66`,
        background: `${color}1a`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function BasesListPanel() {
  const { listOpen, closeList, map: reviewMap, openModal } = useReview();
  const [dim, setDim] = useState<Dimension>("overworld");
  const { bases, remove: removeBase } = useCombinedBases({ dim, limit: 1000 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [notesByKey, setNotesByKey] = useState<Map<string, string>>(new Map());
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // When the list opens, load notes for every base reviewed (one
  // round-trip per base — acceptable up to ~200 bases ; for larger
  // catalogs we'll need a bulk endpoint).
  useEffect(() => {
    if (!listOpen) return;
    let cancelled = false;
    const keys = bases.map((b) => b.idempotency_key);
    const reviewed = keys.filter((k) => reviewMap.has(k));
    if (reviewed.length === 0) {
      setNotesByKey(new Map());
      return;
    }
    Promise.all(reviewed.map((k) => fetchReview(k).catch(() => null)))
      .then((reviews) => {
        if (cancelled) return;
        const next = new Map<string, string>();
        reviews.forEach((r: Review | null, i: number) => {
          if (r?.notes) next.set(reviewed[i], r.notes);
        });
        setNotesByKey(next);
      });
    return () => {
      cancelled = true;
    };
  }, [listOpen, bases, reviewMap]);

  // Esc closes the panel.
  useEffect(() => {
    if (!listOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
        closeList();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listOpen, closeList]);

  const baseTypes = useMemo(() => {
    const set = new Set<string>();
    for (const b of bases) set.add(String(b.base_type));
    return Array.from(set).sort();
  }, [bases]);

  const filtered = useMemo(() => {
    let out = bases.filter((b) => {
      const status: ReviewStatus | "PENDING" =
        reviewMap.get(b.idempotency_key) ?? "PENDING";
      if (statusFilter !== "all") {
        const wanted = statusFilter.toUpperCase();
        if (status !== wanted) return false;
      }
      if (typeFilter !== "all" && String(b.base_type) !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          String(b.base_type),
          String(b.dimension),
          String(b.idempotency_key),
          notesByKey.get(b.idempotency_key) ?? "",
          `${b.world_x ?? ""} ${b.world_z ?? ""}`,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    out = [...out].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "score":
          cmp = Number(a.score ?? 0) - Number(b.score ?? 0);
          break;
        case "found":
          cmp = Number(a.ts_utc_ms ?? 0) - Number(b.ts_utc_ms ?? 0);
          break;
        case "type":
          cmp = String(a.base_type).localeCompare(String(b.base_type));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return out;
  }, [bases, reviewMap, statusFilter, typeFilter, search, sortKey, sortDir, notesByKey]);

  if (!listOpen) return null;

  const handleDelete = async (b: BaseFoundEvent) => {
    if (!window.confirm(`Delete this ${b.base_type}? This is irreversible.`)) return;
    setDeletingKey(b.idempotency_key);
    try {
      await removeBase(b.idempotency_key);
    } finally {
      setDeletingKey(null);
    }
  };

  const sortToggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const dims: Dimension[] = ["overworld", "nether", "end"];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full max-h-[920px] w-full max-w-[1500px] flex-col overflow-hidden rounded-lg border border-[var(--line-strong)] bg-[var(--surface-1)] shadow-2xl">
        {/* Header */}
        <header className="flex shrink-0 flex-col gap-2 border-b border-[var(--line)] bg-[var(--bg-deep)] px-5 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-100)]">
              All bases
              <span className="ml-3 text-sm font-normal text-[var(--text-50)]">
                {filtered.length} / {bases.length}
              </span>
            </h2>
            <button
              onClick={closeList}
              className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-70)] hover:bg-[var(--surface-3)] hover:text-[var(--text-100)]"
            >
              Close · Esc
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* dim */}
            <div className="inline-flex overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
              {dims.map((d) => (
                <button
                  key={d}
                  onClick={() => setDim(d)}
                  className={
                    "px-3 py-1 capitalize " +
                    (dim === d
                      ? "bg-[var(--surface-3)] text-[var(--text-100)]"
                      : "text-[var(--text-50)] hover:bg-[var(--surface-2)]")
                  }
                >
                  {DIMENSIONS[d].label}
                </button>
              ))}
            </div>

            {/* status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)] px-2 py-1 text-[var(--text-70)]"
            >
              <option value="all">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="REAL">Real</option>
              <option value="INTERESTING">Interesting</option>
              <option value="FALSE_POSITIVE">False positive</option>
            </select>

            {/* type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)] px-2 py-1 text-[var(--text-70)]"
            >
              <option value="all">All types</option>
              {baseTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* search */}
            <input
              type="search"
              placeholder="Search type, coords, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[260px] flex-1 rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 py-1 text-[var(--text-100)] outline-none focus:border-[var(--cyan)]/50"
            />
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--text-50)]">
              No bases match the current filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--bg-deep)]">
                <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--text-50)]">
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => sortToggle("type")}
                      className="hover:text-[var(--text-100)]"
                    >
                      Type {sortKey === "type" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button
                      onClick={() => sortToggle("score")}
                      className="hover:text-[var(--text-100)]"
                    >
                      Score {sortKey === "score" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-mono normal-case text-[10px]">
                    Coords
                  </th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => sortToggle("found")}
                      className="hover:text-[var(--text-100)]"
                    >
                      Found {sortKey === "found" && (sortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const status: ReviewStatus | "PENDING" =
                    reviewMap.get(b.idempotency_key) ?? "PENDING";
                  const wx = Math.round(Number(b.world_x ?? Number(b.chunk_x) * 16 + 8));
                  const wz = Math.round(Number(b.world_z ?? Number(b.chunk_z) * 16 + 8));
                  const wy = b.world_y ?? "?";
                  const isDeleting = deletingKey === b.idempotency_key;

                  return (
                    <tr
                      key={b.idempotency_key}
                      className="border-b border-[var(--line)] transition-colors hover:bg-[var(--surface-2)]/40"
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: colorForType(String(b.base_type)) }}
                          />
                          <span className="capitalize text-[var(--text-100)]">
                            {String(b.base_type).toLowerCase().replace(/_/g, " ")}
                          </span>
                          {b.ts_utc_ms === 0 && (
                            <span
                              className="rounded-sm border border-[var(--text-30)]/50 bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--text-50)]"
                              title="Reviewed but the base event was deleted from the DB"
                            >
                              orphan
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular text-[var(--amber)]">
                        {Number(b.score ?? 0).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular text-[var(--text-70)]">
                        {wx.toLocaleString().replace(/,/g, " ")},{" "}
                        <span className="text-[var(--cyan)]">{wy}</span>,{" "}
                        {wz.toLocaleString().replace(/,/g, " ")}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-3 py-2">
                        <NotesCell
                          baseKey={b.idempotency_key}
                          initialNotes={notesByKey.get(b.idempotency_key) ?? ""}
                          currentStatus={status}
                          onSaved={(n) => {
                            setNotesByKey((prev) => {
                              const next = new Map(prev);
                              if (n) next.set(b.idempotency_key, n);
                              else next.delete(b.idempotency_key);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-[var(--text-50)]">
                        {relativeTime(Number(b.ts_utc_ms))} ago
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => {
                              closeList();
                              openModal(b.idempotency_key);
                            }}
                            className="rounded-sm border border-[var(--cyan)]/40 bg-[var(--cyan)]/10 px-2 py-1 text-[11px] text-[var(--cyan)] hover:bg-[var(--cyan)]/20"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => void handleDelete(b)}
                            disabled={isDeleting}
                            className="rounded-sm border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-2 py-1 text-[11px] text-[var(--rose)] hover:bg-[var(--rose)]/20 disabled:opacity-50"
                          >
                            {isDeleting ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
