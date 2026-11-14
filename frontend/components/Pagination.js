'use client';

/**
 * Reusable pagination bar.
 * Renders a windowed page list (with gaps), page-size select, and a result summary.
 * The active page chip morphs between positions (layoutId), rows animate in
 * with a stagger, and prev/next buttons spring on tap.
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
    <div className="flex flex-col items-center justify-between gap-3 border-t border-mist-150 bg-mist-50/50 px-4 py-3 sm:flex-row sm:rounded-b-2xl">
      <p className="text-sm text-mist-500">
        Showing <span className="font-mono font-semibold text-mist-900 tnum">{from}–{to}</span> of{' '}
        <span className="font-mono font-semibold text-mist-900 tnum">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-sm text-mist-500 sm:flex">
          Rows
          <select
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="rounded-[8px] border border-mist-200 bg-white px-2 py-1 text-sm font-medium text-mist-800 shadow-xs transition hover:border-mist-300 focus:border-sea-500 focus:outline-none focus:ring-2 focus:ring-sea-500/20"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <motion.button
            onClick={() => onPage(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.88 }}
            transition={springs.snappy}
            className="icon-btn disabled:cursor-not-allowed disabled:opacity-30"
          >
            {Icon.chevronLeft({ size: 15 })}
          </motion.button>
          {windowed().map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1.5 text-sm text-mist-400">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                disabled={disabled}
                aria-current={p === page ? 'page' : undefined}
                className={`relative min-w-[2rem] rounded-[8px] px-2 py-1 font-mono text-sm tnum transition-colors duration-150 ${
                  p === page ? 'font-semibold text-white' : 'text-mist-600 hover:bg-mist-100 hover:text-mist-900'
                }`}
              >
                {p === page && (
                  <motion.span
                    layoutId="page-chip"
                    transition={springs.layout}
                    className="absolute inset-0 rounded-[8px] bg-sea-700 shadow-xs"
                  />
                )}
                <span className="relative z-10">{p}</span>
              </button>
            )
          )}
          <motion.button
            onClick={() => onPage(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.88 }}
            transition={springs.snappy}
            className="icon-btn disabled:cursor-not-allowed disabled:opacity-30"
          >
            {Icon.chevronRight({ size: 15 })}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
