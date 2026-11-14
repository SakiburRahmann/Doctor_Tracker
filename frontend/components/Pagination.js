'use client';

/**
 * Reusable pagination bar.
 * Renders a windowed page list (with gaps), page-size select, and a result summary.
 * Pure presentation; state lives in the page via URL params.
 */
import { Icon } from './icons';

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
    if (page > 3) push('gap');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) push(i);
    if (page < totalPages - 2) push('gap');
    push(totalPages);
    return pages;
  };

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline px-4 py-3 sm:flex-row">
      <p className="text-sm text-ink-600">
        Showing <span className="font-mono font-medium text-ink-900">{from}-{to}</span> of{' '}
        <span className="font-mono font-medium text-ink-900">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-sm text-ink-600 sm:flex">
          Rows
          <select
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="rounded-[3px] border border-hairline-strong bg-white px-2 py-1 text-sm"
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
            className="rounded-[3px] border border-hairline-strong bg-white p-1.5 text-ink-600 hover:bg-sand-100 disabled:opacity-40"
          >
            {Icon.chevronLeft({ size: 14 })}
          </button>
          {windowed().map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1.5 text-sm text-sand-400">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                disabled={disabled}
                aria-current={p === page ? 'page' : undefined}
                className={`min-w-[2rem] rounded-[3px] border px-2 py-1 font-mono text-sm ${
                  p === page
                    ? 'border-spruce-700 bg-spruce-700 font-semibold text-sand-50'
                    : 'border-hairline-strong bg-white text-ink-700 hover:bg-sand-100'
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
            className="rounded-[3px] border border-hairline-strong bg-white p-1.5 text-ink-600 hover:bg-sand-100 disabled:opacity-40"
          >
            {Icon.chevronRight({ size: 14 })}
          </button>
        </div>
      </div>
    </div>
  );
}
