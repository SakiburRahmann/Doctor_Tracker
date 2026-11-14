'use client';

/**
 * Dashboard — analytics from the server-side aggregation endpoints.
 *
 * Charts (Recharts, client-only to keep SSR clean):
 *   1. Area chart  : patients & doctors created per day (last 14 days)
 *   2. Bar chart   : patients per doctor (top 10)
 *   3. Donut chart : patient condition distribution
 *   4. Stat cards  : totals at a glance
 */
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import Protected from '@/components/Protected';
import { useApi } from '@/lib/useApi';
import { PageHeader, StatCard, LoadingTable, ErrorState, EmptyState } from '@/components/ui';

const CONDITION_COLORS = {
  Critical: '#e11d48',
  Serious: '#f97316',
  Stable: '#10b981',
  Recovering: '#14b8a6',
  Chronic: '#8b5cf6',
  'Under Observation': '#0ea5e9',
};

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function DashboardBody() {
  const { data: overview, loading: l1, error: e1, refetch: r1 } = useApi('/api/analytics/overview');
  const { data: daily, loading: l2, error: e2, refetch: r2 } = useApi('/api/analytics/daily', { days: 14 });
  const { data: conditions, loading: l3, error: e3, refetch: r3 } = useApi('/api/analytics/conditions');

  const [days, setDays] = useState(14);
  const { data: dailySel } = useApi('/api/analytics/daily', { days });

  if (e1) return <ErrorState message={e1.message} onRetry={r1} />;
  if (l1 || l2 || l3) return <LoadingTable rows={6} cols={4} />;

  if (!overview) return <EmptyState title="No analytics available" hint="Seed the database to see dashboard data." />;

  const series = (dailySel || daily)?.series?.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  })) || [];

  const pieData = (conditions || []).map((c) => ({ name: c.condition, value: c.count }));
  const totalPatients = overview.totalPatients;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of doctors and patients across the system."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total doctors" value={overview.totalDoctors} sub={`${overview.activeDoctors} active`} icon="🩺" tone="brand" />
        <StatCard label="Total patients" value={overview.totalPatients} sub="All-time records" icon="🧑‍🤝‍🧑" tone="sky" />
        <StatCard
          label="Avg patients / doctor"
          value={overview.totalDoctors ? (overview.totalPatients / overview.totalDoctors).toFixed(1) : '0'}
          sub="Across all doctors"
          icon="📈"
          tone="violet"
        />
        <StatCard
          label="Critical patients"
          value={(conditions || []).find((c) => c.condition === 'Critical')?.count ?? 0}
          sub="Requiring urgent attention"
          icon="⚠️"
          tone="amber"
        />
      </div>

      {/* Trend + condition distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard
          title="Registrations per day"
          subtitle="Patients and doctors created (date-based statistics)"
          className="lg:col-span-3"
        >
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <span>Range</span>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full border px-2.5 py-0.5 transition ${
                  days === d
                    ? 'border-brand-600 bg-brand-600 font-medium text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDoctors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={42} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(value, name) => [value, name === 'patients' ? 'Patients' : 'Doctors']}
                />
                <Legend formatter={(v) => (v === 'patients' ? 'Patients' : 'Doctors')} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="patients" stroke="#0d9488" strokeWidth={2} fill="url(#gPatients)" />
                <Area type="monotone" dataKey="doctors" stroke="#6366f1" strokeWidth={2} fill="url(#gDoctors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Patient conditions"
          subtitle="Distribution across all patients"
          className="lg:col-span-2"
        >
          {pieData.length === 0 ? (
            <EmptyState title="No patient data yet" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CONDITION_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value, name) => [`${value} patients (${((value / totalPatients) * 100).toFixed(0)}%)`, name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Patients per doctor + specialization breakdown */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <ChartCard title="Patients per doctor" subtitle="Top 10 by patient count" className="lg:col-span-3">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview.patientsPerDoctor.map((d) => ({
                  name: d.name.length > 18 ? `${d.name.slice(0, 17)}…` : d.name,
                  patients: d.patientCount,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(v) => [v, 'Patients']}
                />
                <Bar dataKey="patients" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Doctors by specialization" subtitle="Head count per specialty" className="lg:col-span-2">
          <ul className="space-y-3">
            {overview.bySpecialization.map((s) => {
              const max = overview.bySpecialization[0]?.count || 1;
              return (
                <li key={s.specialization}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{s.specialization}</span>
                    <span className="text-slate-400">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(s.count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {overview.bySpecialization.length === 0 && (
              <li className="text-sm text-slate-400">No doctors yet.</li>
            )}
          </ul>
        </ChartCard>
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
