'use client';

/**
 * Animated page furniture: spotlight KPI cards (mouse-tracked glow + sparkline
 * + spring count-up), page header with entrance, shimmer skeletons,
 * spring-animated empty/error states.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Icon } from './icons';
import { SpotlightCard, springs } from './motion-kit';

/** Count-up driver: runs when the card scrolls into view. */
function useSpringCount(value, enabled) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!enabled || value == null) {
      setDisplay(value ?? 0);
      return undefined;
    }
    const start = performance.now();
    const duration = 750;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 4; // ease-out quart
      setDisplay(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, enabled]);
  return display;
}

/** Tiny sparkline (Tremor-style micro-chart under the metric). */
function Sparkline({ data = [], color = '#1F817B', id }) {
  if (data.length < 2) return null;
  const w = 92;
  const h = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`);
  const line = `M ${pts.join(' L ')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${line} L ${w},${h} L 0,${h} Z`}
        fill={`url(#spark-${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      />
      <motion.circle
        cx={w}
        cy={Number(pts[pts.length - 1].split(',')[1])}
        r="2.6"
        fill={color}
        stroke="#fff"
        strokeWidth="1.4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springs.bouncy, delay: 1.2 }}
      />
    </svg>
  );
}

/**
 * KPI stat card: spotlight follows cursor, value counts up,
 * sparkline draws itself in. Tinted icon chip for at-a-glance semantics.
 */
export function StatTile({ label, value, sub, tint = 'bg-sea-50 text-sea-700', icon = null, spark = null, sparkColor, className = '', index = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const isNumber = typeof value === 'number';
  const count = useSpringCount(isNumber ? value : null, inView);
  const Ico = icon;
  return (
    <SpotlightCard
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ ...springs.soft, delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className={`panel relative overflow-hidden p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mist-500">{label}</p>
          <p className="mt-2 font-mono text-[32px] font-semibold leading-none tracking-tight text-mist-900 tnum">
            {isNumber ? count : value}
          </p>
        </div>
        {Ico && (
          <motion.span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${tint}`}
            whileHover={{ rotate: -6, scale: 1.08 }}
            transition={springs.bouncy}
          >
            {Ico({ size: 19 })}
          </motion.span>
        )}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        {sub && <p className="text-[13px] leading-snug text-mist-500">{sub}</p>}
        {spark && <Sparkline data={spark} color={sparkColor} id={label.replace(/\W/g, '')} />}
      </div>
    </SpotlightCard>
  );
}

export function PageHeader({ title, meta, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.soft}
          className="text-[26px] font-semibold tracking-tight text-mist-900"
        >
          {title}
        </motion.h1>
        {meta && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-1 text-sm text-mist-500"
          >
            {meta}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.08 }}
          className="flex flex-wrap items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.soft}
      className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-mist-300 bg-white/60 px-6 py-16 text-center shadow-xs"
    >
      <motion.span
        className="grid h-12 w-12 place-items-center rounded-full bg-mist-100 text-mist-400"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {Icon.inbox({ size: 22 })}
      </motion.span>
      <p className="text-sm font-semibold text-mist-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-mist-500">{hint}</p>}
      {action}
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springs.snappy}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center"
    >
      <motion.span
        className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600"
        animate={{ x: [0, -4, 4, -3, 3, 0] }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        {Icon.alert({ size: 22 })}
      </motion.span>
      <p className="text-sm font-semibold text-rose-700">Could not load data</p>
      <p className="max-w-md text-sm text-rose-600/90">{message}</p>
      {onRetry && (
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.bouncy}
          className="btn-secondary mt-1"
        >
          {Icon.refresh({ size: 14 })} Reload
        </motion.button>
      )}
    </motion.div>
  );
}
