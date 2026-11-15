'use client';

/**
 * Shared page furniture: header, KPI tile, panel, and the three data states.
 * Typography and spacing follow the reference: oversized page title, small
 * uppercase eyebrow labels, tabular figures, restrained motion.
 */
import { motion } from 'motion/react';
import { Icon } from './icons';
import { springs } from './motion-kit';
import BackButton from './BackButton';

/** Page title block. `back` renders the shared back control before the title. */
export function PageHeader({ title, meta, actions, back = false }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {back && <BackButton />}
        <div className="min-w-0">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.soft}
          className="text-[24px] font-semibold leading-none tracking-[-0.025em] text-ink sm:text-[26px]"
        >
          {title}
        </motion.h1>
        {meta && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-1.5 text-[12.5px] text-ink-3"
          >
            {meta}
          </motion.p>
        )}
        </div>
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.06 }}
          className="flex flex-wrap items-center gap-1.5"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
}

/** KPI tile: label, oversized value, optional trend chip and footnote. */
export function StatTile({ label, value, sub, trend, trendTone = 'accent', icon, className = '', index = 0, highlight = false }) {
  const Ico = icon;
  const tones = {
    accent: 'bg-accent-soft text-accent-strong',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
    neutral: 'bg-surface-3 text-ink-2',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.soft, delay: index * 0.05 }}
      className={`card relative p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Ico && <span className="icon-chip">{Ico({ size: 15 })}</span>}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <p
          className={`text-[30px] font-semibold leading-none tracking-[-0.03em] tnum ${
            highlight ? 'text-accent-strong' : 'text-ink'
          }`}
        >
          {value}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {trend && <span className={`badge ${tones[trendTone]}`}>{trend}</span>}
        {sub && <p className="truncate text-[12px] text-ink-3">{sub}</p>}
      </div>
    </motion.div>
  );
}

/** Section container with a title row. */
export function Panel({ title, note, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || action) && (
        <header className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
            {note && <p className="mt-0.5 text-[11.5px] text-ink-3">{note}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function LoadingTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap p-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="skeleton h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, opacity: 1 - r * 0.1 }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.soft}
      className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface-2 text-ink-3">
        {Icon.inbox({ size: 18 })}
      </span>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-ink-3">{hint}</p>}
      {action}
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.soft}
      className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
        {Icon.alert({ size: 18 })}
      </span>
      <p className="text-[14px] font-semibold text-ink">Could not load data</p>
      <p className="max-w-md text-[13px] text-ink-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-1">
          {Icon.refresh({ size: 14 })} Try again
        </button>
      )}
    </motion.div>
  );
}
