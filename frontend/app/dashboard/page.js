'use client';

/**
 * Dashboard page: reads the server-side aggregation endpoints.
 *
 * Charts (Recharts, client-only to keep SSR clean):
 *   1. Area chart  : patients and doctors registered per day
 *   2. Bar chart   : patients per doctor (top 10)
 *   3. Donut chart : patient condition distribution
 *   4. Stat tiles  : totals at a glance
 */
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Protected from '@/components/Protected';
import { useApi } from '@/lib/useApi';
import { PageHeader, StatTile, LoadingTable, ErrorState, EmptyState } from '@/components/ui';

/* Muted instrument palette (clinical severity ordering, no purple). */
const CONDITION_COLORS = {
  Critical: '#A13434',
  Serious: '#B4632C',
  Stable: '#3A7A57',
  Recovering: '#5E9275',
  Chronic: '#6E6A5E',
  'Under Observation': '#8C8C7E',
};

const AXIS = { fontSize: 11, fill: '#6E6A5E' };
const GRID = '#E4E0D6';
const TOOLTIP_STYLE = {
  borderRadius: 4,
  border: '1px solid #D4CFC2',
  background: '#F8F7F3',
  fontSize: 12,
  color: '#272B24',
  boxShadow: 'none',
};

function ChartPanel({ title, note, children, className = '' }) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="mb-4 border-b border-hairline pb-3">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-ink-600">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function LegendRow({ items }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-2 text-xs font-medium text-ink-700">
          <span className="h-[9px] w-[9px] rounded-[1px]" style={{ backgroundColor: color }} />
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
  const pieLegend = pieData.map((d) => [d.name, CONDITION_COLORS[d.name] || '#8C8C7E']);

  return (
    <>
      <PageHeader
        title="Dashboard"
        meta={`${overview.totalDoctors} doctors and ${overview.totalPatients} patients on record`}
      />

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Doctors"
          value={overview.totalDoctors}
          sub={`${overview.activeDoctors} active, ${overview.totalDoctors - overview.activeDoctors} inactive`}
        />
        <StatTile label="Patients" value={overview.totalPatients} sub="records since seed" />
        <StatTile
          label="Patients per doctor"
          value={overview.totalDoctors ? (overview.totalPatients / overview.totalDoctors).toFixed(1) : '0'}
          from={overview.totalDoctors}
          sub="average caseload"
        />
        <StatTile label="Critical" value={criticalCount} from={totalPatients} sub="patients flagged critical" />
      </div>

      {/* Trend + condition distribution */}
      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        <ChartPanel
          title="Registrations per day"
          note="Patients and doctors added to the registry"
          className="lg:col-span-3"
        >
          <div className="mb-3 flex items-center gap-2 text-xs text-ink-600">
            <span className="uppercase tracking-[0.08em]">Range</span>
            <div className="flex items-center gap-1">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`rounded-[3px] border px-2 py-0.5 font-mono transition ${
                    days === d
                      ? 'border-spruce-700 bg-spruce-700 font-semibold text-sand-50'
                      : 'border-hairline-strong bg-white text-ink-700 hover:bg-sand-100'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#24644B" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#24644B" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gDoctors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B4632C" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#B4632C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={38} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [value, name === 'patients' ? 'Patients' : 'Doctors']}
                />
                <Area type="monotone" dataKey="patients" stroke="#24644B" strokeWidth={1.5} fill="url(#gPatients)" />
                <Area type="monotone" dataKey="doctors" stroke="#B4632C" strokeWidth={1.5} fill="url(#gDoctors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <LegendRow items={[['Patients', '#24644B'], ['Doctors', '#B4632C']]} />
        </ChartPanel>

        <ChartPanel
          title="Patient conditions"
          note={`Distribution across ${totalPatients} records`}
          className="lg:col-span-2"
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
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={1.5}
                      stroke="#F8F7F3"
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] || '#8C8C7E'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value, name) => [`${value} patients (${((value / totalPatients) * 100).toFixed(0)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <LegendRow items={pieLegend} />
            </>
          )}
        </ChartPanel>
      </div>

      {/* Patients per doctor + specialization census */}
      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        <ChartPanel title="Patients per doctor" note="Top 10 caseloads" className="lg:col-span-3">
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
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#3C413A' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: '#F1EFEA' }}
                  formatter={(v) => [v, 'Patients']}
                />
                <Bar dataKey="patients" fill="#24644B" radius={[0, 2, 2, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Doctors by specialty" note="Head count per specialty" className="lg:col-span-2">
          <table className="w-full text-sm">
            <tbody>
              {overview.bySpecialization.map((s, i) => (
                <tr key={s.specialization} className="border-b border-hairline last:border-b-0">
                  <td className="py-2 pl-1 font-medium text-ink-800">{s.specialization}</td>
                  <td className="w-24 py-2">
                    <div className="flex h-1.5 w-full items-center">
                      <div
                        className="h-1.5 bg-spruce-600"
                        style={{ width: `${(s.count / (overview.bySpecialization[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="w-8 py-2 text-right font-mono font-medium text-ink-900">{s.count}</td>
                  <td className="w-8 py-2 text-right font-mono text-xs text-sand-500">
                    {(s.count / overview.totalDoctors * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
              {overview.bySpecialization.length === 0 && (
                <tr>
                  <td className="py-2 text-sm text-sand-500">No doctors on record.</td>
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
