'use client';

/**
 * Reusable pagination bar.
 * Renders a windowed page list (… gaps), page-size select, and a result summary.
 * Pure presentation — state lives in the page via URL params.
 */
export default function Pagination({ page, limit, total, totalPages, onPage, onLimit, disabled }) {
  if (!totalPages) return null;

  const windowed = () => {
    const pages = [];
    const push = (p) => pages.push(p);
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) push(i);
      return pages;
    }
    push(1);
    if (page > 3) push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) push(i);
    if (page < totalPages - 2) push('…');
    push(totalPages);
    return pages;
  };

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
          Rows
          <select
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            ‹
          </button>
          {windowed().map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1.5 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                disabled={disabled}
                className={`min-w-[2rem] rounded-md border px-2 py-1 text-sm ${
                  p === page
                    ? 'border-brand-600 bg-brand-600 font-semibold text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
