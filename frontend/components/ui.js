'use client';

/**
 * Empty / error / loading states and page furniture used by every data table.
 * Keeps list pages free of repeated conditional JSX.
 */
import { Icon } from './icons';

export function LoadingTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap p-0">
      <div className="animate-pulse px-4 py-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 rounded bg-sand-200" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 rounded bg-sand-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-hairline-strong bg-sand-50 px-6 py-14 text-center">
      <span className="text-sand-400">{Icon.inbox({ size: 28 })}</span>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-600">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-brick-200 bg-brick-50 px-6 py-10 text-center">
      <span className="text-brick-600">{Icon.alert({ size: 24 })}</span>
      <p className="text-sm font-semibold text-brick-700">Could not load data</p>
      <p className="max-w-md text-sm text-brick-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Reload
        </button>
      )}
    </div>
  );
}

/**
 * Stat tile: label, number, and a datum the number is computed from.
 * No icon decoration; numbers are the content.
 */
export function StatTile({ label, value, from, sub }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-600">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <p className="font-mono text-[28px] font-semibold leading-none tracking-tight text-ink-900">{value}</p>
        {from !== undefined && (
          <p className="font-mono text-xs text-sand-500">of {from}</p>
        )}
      </div>
      {sub && <p className="mt-1.5 text-xs text-ink-600">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, meta, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {meta && <p className="mt-1 text-sm text-ink-600">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
