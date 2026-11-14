'use client';

/**
 * Dashboard page: reads the server-side aggregation endpoints.
 *
 * Charts (Recharts, client-only to keep SSR clean):
 *   1. Area chart  : patients and doctors registered per day
 *   2. Bar chart   : patients per doctor (top 10)
 *   3. Donut chart : patient condition distribution
 *   4. KPI cards   : totals at a glance (animated count-up)
 */
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Protected from '@/components/Protected';
import { useApi } from '@/lib/useApi';
import { Icon } from '@/components/icons';
import { PageHeader, StatTile, LoadingTable, ErrorState, EmptyState } from '@/components/ui';

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
    <div className="rounded-xl border border-mist-200 bg-white px-3 py-2 shadow-overlay">
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
    </div>
  );
}

function ChartPanel({ title, note, children, className = '', action = null }) {
  return (
    <div className={`panel anim-rise p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-mist-900">{title}</h2>
          {note && <p className="mt-0.5 text-[13px] text-mist-500">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function LegendRow({ items }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-2 text-xs font-medium text-mist-600">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </li>
      ))}
    </ul>
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        meta={`${overview.totalDoctors} doctors and ${overview.totalPatients} patients on record`}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-mist-500 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sea-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sea-500" />
            </span>
            Live data
          </span>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          className="anim-rise"
          label="Doctors"
          value={overview.totalDoctors}
          sub={`${overview.activeDoctors} active · ${overview.totalDoctors - overview.activeDoctors} inactive`}
          icon={Icon.stethoscope}
          tint="bg-sea-50 text-sea-700"
        />
        <StatTile
          className="anim-rise delay-1"
          label="Patients"
          value={overview.totalPatients}
          sub="records since seed"
          icon={Icon.users}
          tint="bg-amber-50 text-amber-600"
        />
        <StatTile
          className="anim-rise delay-2"
          label="Patients per doctor"
          value={overview.totalDoctors ? (overview.totalPatients / overview.totalDoctors).toFixed(1) : '0'}
          sub="average caseload"
          icon={Icon.gauge}
          tint="bg-mist-150 text-mist-700"
        />
        <StatTile
          className="anim-rise delay-3"
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
          title="Registrations per day"
          note="Patients and doctors added to the registry"
          className="anim-rise delay-2 lg:col-span-3"
          action={
            <div className="seg" role="group" aria-label="Date range">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`seg-btn ${days === d ? 'seg-btn-active' : 'hover:text-mist-700'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          }
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
                <Area type="monotone" dataKey="patients" stroke={SEA} strokeWidth={2} fill="url(#gPatients)" animationDuration={700} />
                <Area type="monotone" dataKey="doctors" stroke={AMBER} strokeWidth={2} fill="url(#gDoctors)" animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <LegendRow items={[['Patients', SEA], ['Doctors', AMBER]]} />
        </ChartPanel>

        <ChartPanel
          title="Patient conditions"
          note={`Distribution across ${totalPatients} records`}
          className="anim-rise delay-3 lg:col-span-2"
        >
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
                      animationDuration={700}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] || '#96A2AB'} className="transition-opacity hover:opacity-80" />
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
        <ChartPanel title="Patients per doctor" note="Top 10 caseloads" className="anim-rise delay-4 lg:col-span-3">
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
                <Bar dataKey="patients" fill={SEA} radius={[0, 6, 6, 0]} barSize={14} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Doctors by specialty" note="Head count per specialty" className="anim-rise delay-5 lg:col-span-2">
          <table className="w-full text-sm">
            <tbody>
              {overview.bySpecialization.map((s) => (
                <tr key={s.specialization} className="border-b border-mist-150 last:border-b-0">
                  <td className="py-2.5 pl-1 font-medium text-mist-800">{s.specialization}</td>
                  <td className="w-28 py-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-mist-150">
                      <div
                        className="h-full origin-left rounded-full bg-gradient-to-r from-sea-500 to-sea-600"
                        style={{
                          width: `${(s.count / (overview.bySpecialization[0]?.count || 1)) * 100}%`,
                          animation: 'growBar 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
                        }}
                      />
                    </div>
                  </td>
                  <td className="w-8 py-2.5 text-right font-mono font-semibold text-mist-900 tnum">{s.count}</td>
                  <td className="w-10 py-2.5 text-right font-mono text-xs text-mist-400 tnum">
                    {(s.count / overview.totalDoctors * 100).toFixed(0)}%
                  </td>
                </tr>
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
