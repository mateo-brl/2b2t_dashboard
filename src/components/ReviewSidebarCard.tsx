import { useQuery } from "@tanstack/react-query";
import { fetchReviewCounts } from "../api/reviews";
import { useReview } from "../api/ReviewContext";

export function ReviewSidebarCard() {
  const { openModal } = useReview();
  const { data } = useQuery({
    queryKey: ["review-counts"],
    queryFn: fetchReviewCounts,
    refetchInterval: 5000,
  });

  const pending = data?.pending ?? 0;
  const real = data?.real ?? 0;
  const falsePos = data?.falsePositive ?? 0;
  const interesting = data?.interesting ?? 0;

  // We don't know the *true* pending count here — only "explicitly
  // PENDING" rows. The number of bases discovered minus reviewed gives
  // a more useful pending count, but it requires the bases list.
  // For now, show explicit reviewed counts and let the modal render the
  // real queue from the bases stream.

  return (
    <section className="rounded-md border border-[var(--line-strong)] bg-[var(--surface-1)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="text-sm font-medium text-[var(--text-100)]">Review</span>
        <span className="text-xs text-[var(--text-50)]">Last 1000</span>
      </header>
      <div className="space-y-3 px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-sm bg-[var(--surface-2)] p-2 text-center">
            <div className="text-[10px] text-[var(--text-50)]">Real</div>
            <div className="mt-0.5 font-mono tabular text-base font-medium text-[var(--emerald)]">
              {real}
            </div>
          </div>
          <div className="rounded-sm bg-[var(--surface-2)] p-2 text-center">
            <div className="text-[10px] text-[var(--text-50)]">Interesting</div>
            <div className="mt-0.5 font-mono tabular text-base font-medium text-[var(--cyan)]">
              {interesting}
            </div>
          </div>
          <div className="rounded-sm bg-[var(--surface-2)] p-2 text-center">
            <div className="text-[10px] text-[var(--text-50)]">False</div>
            <div className="mt-0.5 font-mono tabular text-base font-medium text-[var(--text-50)]">
              {falsePos}
            </div>
          </div>
        </div>

        {pending > 0 && (
          <div className="flex items-center justify-between rounded-sm bg-[var(--surface-2)] px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] text-[var(--text-50)]">Marked pending</span>
            </div>
            <span className="font-mono tabular text-[12px] text-[var(--amber)]">
              {pending}
            </span>
          </div>
        )}

        <button
          onClick={() => openModal()}
          className="w-full rounded-md border border-[var(--cyan)]/40 bg-[var(--cyan)]/10 px-3 py-2 text-sm text-[var(--cyan)] transition-colors hover:bg-[var(--cyan)]/15"
        >
          Open review queue
        </button>
      </div>
    </section>
  );
}
