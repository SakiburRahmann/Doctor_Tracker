'use client';

/**
 * Page furniture: KPI stat cards (animated count-up), page header,
 * shimmer skeletons, empty and error states. Used by every data page.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

/** Count-up driver: animates a number from 0 to `value` over ~600ms. */
function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (value == null) return undefined;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return display;
}

/**
 * KPI stat card: icon chip, label, big animated value, optional context line.
 * The icon chip takes a tint class so each metric reads at a glance.
 */
export function StatTile({ label, value, sub, tint = 'bg-sea-50 text-sea-700', icon = null, className = '' }) {
  const count = useCountUp(typeof value === 'number' ? value : null);
  const Ico = icon;
  return (
    <div className={`panel panel-hover flex items-start justify-between gap-3 p-5 ${className}`}>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mist-500">{label}</p>
        <p className="mt-2 font-mono text-[32px] font-semibold leading-none tracking-tight text-mist-900 tnum">
          {typeof value === 'number' ? count : value}
        </p>
        {sub && <p className="mt-2.5 text-[13px] leading-snug text-mist-500">{sub}</p>}
      </div>
      {Ico && (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${tint}`}>{Ico({ size: 19 })}</span>
      )}
    </div>
  );
}

export function PageHeader({ title, meta, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="anim-rise">
        <h1 className="text-[26px] font-semibold tracking-tight text-mist-900">{title}</h1>
        {meta && <p className="mt-1 text-sm text-mist-500">{meta}</p>}
      </div>
      {actions && <div className="anim-rise flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap p-0">
      <div className="px-5 py-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-3.5" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="mt-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="skeleton h-3.5" style={{ opacity: 1 - r * 0.12 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="anim-fade flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-mist-300 bg-white/60 px-6 py-16 text-center shadow-xs">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-mist-100 text-mist-400">{Icon.inbox({ size: 22 })}</span>
      <p className="text-sm font-semibold text-mist-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-mist-500">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="anim-fade flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600">{Icon.alert({ size: 22 })}</span>
      <p className="text-sm font-semibold text-rose-700">Could not load data</p>
      <p className="max-w-md text-sm text-rose-600/90">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-1">
          {Icon.refresh({ size: 14 })} Reload
        </button>
      )}
    </div>
  );
}
