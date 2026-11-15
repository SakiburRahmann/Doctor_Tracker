'use client';

/**
 * Reusable pagination bar: result summary, page-size select, windowed pages.
 * The active page is the only lime element in the table footer.
 */
import { motion } from 'motion/react';
import { Icon } from './icons';
import { springs } from './motion-kit';

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
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-4 py-3 sm:flex-row">
      <p className="text-[12.5px] text-ink-3">
        Showing <span className="font-medium text-ink tnum">{from}–{to}</span> of{' '}
        <span className="font-medium text-ink tnum">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-[12.5px] text-ink-3 sm:flex">
          Rows
          <select
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="h-8 rounded-full border border-line bg-surface px-2.5 pr-6 text-[12.5px] font-medium text-ink-2 outline-none transition hover:border-line-strong focus:border-accent-hover"
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
            className="icon-btn disabled:cursor-not-allowed disabled:opacity-30"
          >
            {Icon.chevronLeft({ size: 15 })}
          </button>
          {windowed().map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-[13px] text-ink-3">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                disabled={disabled}
                aria-current={p === page ? 'page' : undefined}
                className={`relative h-8 min-w-[2rem] rounded-full px-2.5 text-[12.5px] tnum transition-colors duration-150 ${
                  p === page ? 'font-semibold text-accent-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {p === page && (
                  <motion.span
                    layoutId="page-chip"
                    transition={springs.layout}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                )}
                <span className="relative z-10">{p}</span>
              </button>
            )
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
            className="icon-btn disabled:cursor-not-allowed disabled:opacity-30"
          >
            {Icon.chevronRight({ size: 15 })}
          </button>
        </div>
      </div>
    </div>
  );
}
