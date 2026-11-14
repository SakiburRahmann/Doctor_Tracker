'use client';

/**
 * Dashboard page: reads the server-side aggregation endpoints.
 *
 * Motion-forward: aurora hero header with gradient headline, spotlight KPI
 * cards (sparkline + count-up), spring-animated chart panels, segmented
 * control with layoutId sliding thumb, animated specialty bars.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Protected from '@/components/Protected';
import { useApi } from '@/lib/useApi';
import { Icon } from '@/components/icons';
import { StatTile, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { springs } from '@/components/motion-kit';

/* Semantic severity palette (rose -> amber -> sea scale, neutrals for passive states). */
const CONDITION_COLORS = {
  Critical: '#CE4141',
  Serious: '#D97D20',
  Stable: '#1F817B',
  Recovering: '#52B5AE',
  Chronic: '#49535C',
  'Under Observation': '#96A2AB',
};

const SEA = '#1F817B';
const AMBER = '#D97D20';

const AXIS = { fontSize: 11, fill: '#96A2AB' };
const GRID = '#E2E8EC';

/* Card-local tooltip (white, elevated, tabular numbers). */
function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springs.snappy}
      className="rounded-xl border border-mist-200 bg-white px-3 py-2 shadow-overlay"
    >
      {label != null && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mist-500">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[13px] text-mist-700">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.fill }} />
          {p.name === 'patients' ? 'Patients' : p.name === 'doctors' ? 'Doctors' : p.name}
          <span className="ml-auto pl-4 font-mono font-semibold text-mist-900 tnum">
            {p.value}{suffix}
          </span>
        </p>
      ))}
    </motion.div>
  );
}

/** Chart panel that rises in with a spring when it enters the viewport. */
function ChartPanel({ title, note, children, className = '', action = null, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...springs.soft, delay: index * 0.08 }}
      whileHover={{ y: -2 }}
      className={`panel relative p-5 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-mist-900">{title}</h2>
          {note && <p className="mt-0.5 text-[13px] text-mist-500">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function LegendRow({ items }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
      {items.map(([label, color]) => (
        <motion.li
          key={label}
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2 text-xs font-medium text-mist-600"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </motion.li>
      ))}
    </ul>
  );
}

/** Segmented control whose white thumb morphs between options (layoutId). */
function RangeSeg({ value, onChange, options }) {
  return (
    <div className="seg" role="group" aria-label="Date range">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`relative rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
            value === o.value ? 'text-mist-900' : 'text-mist-500 hover:text-mist-700'
          }`}
        >
          {value === o.value && (
            <motion.span
              layoutId="range-thumb"
              transition={springs.layout}
              className="seg-btn-active absolute inset-0 rounded-[8px]"
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Small glass stat chip used in the hero header. */
function GlassChip({ value, label, tone = 'text-white', index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springs.soft, delay: 0.3 + index * 0.08 }}
      whileHover={{ y: -2, scale: 1.04 }}
      className="glass rounded-xl px-3.5 py-2 text-center"
    >
      <p className={`font-mono text-lg font-semibold tnum ${tone}`}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-sea-100/60">{label}</p>
    </motion.div>
  );
}

function DashboardBody() {
  const { data: overview, loading: l1, error: e1, refetch: r1 } = useApi('/api/analytics/overview');
  const { data: daily, loading: l2, error: e2, refetch: r2 } = useApi('/api/analytics/daily', { days: 14 });
  const { data: conditions, loading: l3, error: e3, refetch: r3 } = useApi('/api/analytics/conditions');

  const [days, setDays] = useState(14);
  const { data: dailySel } = useApi('/api/analytics/daily', { days });

  if (e1) return <ErrorState message={e1.message} onRetry={r1} />;
  if (e2) return <ErrorState message={e2.message} onRetry={r2} />;
  if (e3) return <ErrorState message={e3.message} onRetry={r3} />;
  if (l1 || l2 || l3) return <LoadingTable rows={6} cols={4} />;

  if (!overview) return <EmptyState title="No analytics available" hint="Seed the database to see dashboard data." />;

  const series = (dailySel || daily)?.series?.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  })) || [];

  const pieData = (conditions || []).filter((c) => c.count > 0).map((c) => ({ name: c.condition, value: c.count }));
  const totalPatients = overview.totalPatients;
  const criticalCount = (conditions || []).find((c) => c.condition === 'Critical')?.count ?? 0;
  const pieLegend = pieData.map((d) => [d.name, CONDITION_COLORS[d.name] || '#96A2AB']);

  // Sparkline data: registrations per day.
  const patientSpark = series.map((d) => d.patients);
  const doctorSpark = series.map((d) => d.doctors);

  return (
    <>
      {/* Aurora hero header: gradient headline over drifting light */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.soft}
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-sea-950 via-sea-900 to-[#10333B] p-6 shadow-card"
      >
        <div className="aurora" />
        <div className="grid-overlay" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sea-200/70"
            >
              <span className="relative flex h-2 w-2">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-sea-300"
                  animate={{ scale: [1, 2.4], opacity: [0.8, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sea-300" />
              </span>
              Clinic overview
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, ...springs.soft }}
              className="text-[28px] font-semibold leading-tight tracking-tight text-white"
            >
              The state of the{' '}
              <span className="bg-gradient-to-r from-sea-200 via-[#A8E6DA] to-amber-200 bg-clip-text text-transparent">
                whole registry
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="mt-1 text-sm text-sea-100/60"
            >
              {overview.totalDoctors} doctors and {overview.totalPatients} patients on record
            </motion.p>
          </div>
          <div className="flex items-center gap-3">
            <GlassChip index={0} value={overview.activeDoctors} label="active" />
            <GlassChip index={1} value={totalPatients} label="patients" />
            <GlassChip index={2} value={criticalCount} label="critical" tone="text-rose-200" />
          </div>
        </div>
      </motion.div>

      {/* KPI cards: spotlight + count-up + sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          index={0}
          label="Doctors"
          value={overview.totalDoctors}
          sub={`${overview.activeDoctors} active · ${overview.totalDoctors - overview.activeDoctors} inactive`}
          icon={Icon.stethoscope}
          tint="bg-sea-50 text-sea-700"
          spark={doctorSpark}
          sparkColor={SEA}
        />
        <StatTile
          index={1}
          label="Patients"
          value={overview.totalPatients}
          sub="records since seed"
          icon={Icon.users}
          tint="bg-amber-50 text-amber-600"
          spark={patientSpark}
          sparkColor={AMBER}
        />
        <StatTile
          index={2}
          label="Patients per doctor"
          value={overview.totalDoctors ? (overview.totalPatients / overview.totalDoctors).toFixed(1) : '0'}
          sub="average caseload"
          icon={Icon.gauge}
          tint="bg-mist-150 text-mist-700"
        />
        <StatTile
          index={3}
          label="Critical"
          value={criticalCount}
          sub={`of ${totalPatients} patients flagged critical`}
          icon={Icon.alert}
          tint="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Trend + condition distribution */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <ChartPanel
          index={0}
          title="Registrations per day"
          note="Patients and doctors added to the registry"
          className="lg:col-span-3"
          action={<RangeSeg value={days} onChange={setDays} options={[{ value: 7, label: '7d' }, { value: 14, label: '14d' }, { value: 30, label: '30d' }]} />}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEA} stopOpacity={0.24} />
                    <stop offset="95%" stopColor={SEA} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gDoctors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AMBER} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={AMBER} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} dy={8} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={38} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#CBD5DB', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="patients" stroke={SEA} strokeWidth={2} fill="url(#gPatients)" animationDuration={900} animationEasing="ease-out" />
                <Area type="monotone" dataKey="doctors" stroke={AMBER} strokeWidth={2} fill="url(#gDoctors)" animationDuration={900} animationBegin={150} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <LegendRow items={[['Patients', SEA], ['Doctors', AMBER]]} />
        </ChartPanel>

        <ChartPanel index={1} title="Patient conditions" note={`Distribution across ${totalPatients} records`} className="lg:col-span-2">
          {pieData.length === 0 ? (
            <EmptyState title="No patient data yet" />
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      animationDuration={900}
                      animationBegin={200}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] || '#96A2AB'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip suffix=" patients" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <LegendRow items={pieLegend} />
            </>
          )}
        </ChartPanel>
      </div>

      {/* Patients per doctor + specialization census */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <ChartPanel index={0} title="Patients per doctor" note="Top 10 caseloads" className="lg:col-span-3">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview.patientsPerDoctor.map((d) => ({
                  name: d.name.length > 20 ? `${d.name.slice(0, 19)}…` : d.name,
                  patients: d.patientCount,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke={GRID} horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#49535C' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F4F6' }} />
                <Bar dataKey="patients" fill={SEA} radius={[0, 6, 6, 0]} barSize={14} animationDuration={900} animationBegin={250} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel index={1} title="Doctors by specialty" note="Head count per specialty" className="lg:col-span-2">
          <table className="w-full text-sm">
            <tbody>
              {overview.bySpecialization.map((s, i) => (
                <motion.tr
                  key={s.specialization}
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ ...springs.soft, delay: i * 0.06 }}
                  className="border-b border-mist-150 last:border-b-0"
                >
                  <td className="py-2.5 pl-1 font-medium text-mist-800">{s.specialization}</td>
                  <td className="w-28 py-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-mist-150">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sea-500 to-sea-600"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(s.count / (overview.bySpecialization[0]?.count || 1)) * 100}%` }}
                        viewport={{ once: true, margin: '-20px' }}
                        transition={{ ...springs.soft, delay: 0.15 + i * 0.06 }}
                      />
                    </div>
                  </td>
                  <td className="w-8 py-2.5 text-right font-mono font-semibold text-mist-900 tnum">{s.count}</td>
                  <td className="w-10 py-2.5 text-right font-mono text-xs text-mist-400 tnum">
                    {(s.count / overview.totalDoctors * 100).toFixed(0)}%
                  </td>
                </motion.tr>
              ))}
              {overview.bySpecialization.length === 0 && (
                <tr>
                  <td className="py-2.5 text-sm text-mist-400">No doctors on record.</td>
                </tr>
              )}
            </tbody>
          </table>
        </ChartPanel>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Protected>
      <DashboardBody />
    </Protected>
  );
}
