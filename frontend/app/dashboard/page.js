'use client';

/**
 * Dashboard — the reference composition, section for section:
 *   chrome · title · metric strip + attention card · filter row ·
 *   dark doctor block · doctor detail block with a live activity chart.
 *
 * Every filter is applied by the API, not in the browser: the doctor block
 * asks /api/doctors for exactly the visible slice and reports `meta.total`,
 * so search/filter/sort stay correct (and cheap) as the register grows.
 *
 * Layout contract: on large screens the whole view becomes a single viewport
 * (no page scroll) — the title, cards and filters keep their size and the
 * bottom row absorbs the rest, scrolling its own content when it overflows.
 * Below `lg` everything stacks and the page scrolls normally.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Protected from '@/components/Protected';
import { useApi } from '@/lib/useApi';
import { Icon } from '@/components/icons';
import { ErrorState, LoadingTable } from '@/components/ui';
import Avatar from '@/components/Avatar';
import DoctorFormModal from '@/components/DoctorFormModal';
import DoctorActivityChart from '@/components/DoctorActivityChart';
import ConditionDonut from '@/components/ConditionDonut';
import { formatDate, debounce } from '@/lib/utils';

const SEGMENTS = 6;
const LIST_LIMIT = 50;

const monthKeyOf = (value) => String(value || '').slice(0, 7);



/** Month label over a segmented progress track, with that month's people below. */
function Timeline({ groups }) {
  const cols = Math.max(groups.length, 1);
  return (
    <div
      className="grid gap-x-3 sm:gap-x-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {groups.map((g, i) => (
        <div key={g.key || i} className="min-w-0">
          <p className="text-[11px] font-medium text-ink-3">{g.label}</p>
          <div className="mt-1.5 flex gap-[3px]" aria-hidden>
            {Array.from({ length: SEGMENTS }).map((_, s) => (
              <span
                key={s}
                className={`h-[9px] flex-1 rounded-full ${s < g.filled ? 'bg-accent' : 'bg-line-strong/70'}`}
              />
            ))}
          </div>
          <div className="mt-3 flex h-[32px] items-center -space-x-2.5">
            {g.people.map((p, j) => (
              <Avatar
                key={p._id || j}
                id={p._id}
                name={p.name}
                kind={p.kind}
                size={32}
                className="ring-2 ring-panel"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricColumn({ label, value, suffix, groups }) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5 text-ink">
        <span className="text-[26px] font-normal leading-none tracking-[-0.03em] tnum sm:text-[32px]">
          {value}
        </span>
        {suffix && <span className="text-[12px] text-ink-3">{suffix}</span>}
      </p>
      <div className="mt-auto pt-6">
        <Timeline groups={groups} />
      </div>
    </div>
  );
}

function DoctorRow({ doctor, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors duration-150 ${
        selected ? 'sel-row' : 'hover:bg-white/5'
      }`}
    >
      <Avatar id={doctor._id} name={doctor.name} kind="doctor" size={30} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[12.5px] font-semibold ${selected ? 'text-white' : 'text-ink'}`}>
          {doctor.name}
        </p>
        <p className={`truncate text-[10.5px] ${selected ? 'text-white/75' : 'text-ink-3'}`}>
          {doctor.specialization}
        </p>
      </div>
      <span
        className={`hidden w-[68px] shrink-0 justify-center rounded-full border px-2 py-1 text-[10px] font-medium sm:inline-flex ${
          selected ? 'border-transparent bg-white text-[#20242b]' : 'border-white/20 text-white/60'
        }`}
      >
        {doctor.status}
      </span>
      <span
        className={`w-[58px] shrink-0 text-right text-[12.5px] font-semibold tnum ${
          selected ? 'text-white' : 'text-ink'
        }`}
      >
        {doctor.patientCount ?? 0}
        <span className={`ml-1 text-[9.5px] font-normal ${selected ? 'text-white/70' : 'text-ink-3'}`}>
          ppl
        </span>
      </span>
    </button>
  );
}

/** Six-month admission trend + condition mix for the selected doctor. */
function DoctorStats({ doctorId }) {
  const { data, loading, error, refetch } = useApi(`/api/doctors/${doctorId}/stats`);

  if (loading) return <div className="skeleton min-h-[110px] flex-1 rounded-[11px]" />;

  if (error) {
    return (
      <div className="flex min-h-[110px] flex-1 flex-col items-center justify-center gap-1.5 text-center">
        <p className="text-[11px] text-white/60">Could not load activity</p>
        <button type="button" onClick={refetch} className="text-[11px] font-semibold text-white underline">
          Try again
        </button>
      </div>
    );
  }

  const conditions = data?.conditions || [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <DoctorActivityChart months={data?.months || []} />
      {conditions.length > 0 && (
        <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
          {conditions.slice(0, 4).map((c) => (
            <span
              key={c.condition}
              className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] leading-none text-white/70"
            >
              {c.condition} <span className="font-semibold text-white tnum">{c.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardBody() {
  const { data: overview, loading: l1, error: e1, refetch: r1 } = useApi('/api/analytics/overview');
  const { data: conditions, loading: l3, error: e3, refetch: r3 } = useApi('/api/analytics/conditions');
  const { data: monthly, loading: l2, error: e2, refetch: r2 } = useApi('/api/analytics/monthly', { months: 12 });
  const { data: recentPatients } = useApi('/api/patients', { limit: 100, sort: 'newest' });
  const { data: filterOptions } = useApi('/api/doctors/meta');

  const [spec, setSpec] = useState('');
  const [hospital, setHospital] = useState('');
  const [sort, setSort] = useState('newest');
  const [win, setWin] = useState('any');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);

  const applySearch = useMemo(() => debounce((value) => setQ(value), 350), []);

  const createdFrom = useMemo(() => {
    if (win === 'any') return '';
    const d = new Date();
    d.setDate(d.getDate() - Number(win));
    return d.toISOString().slice(0, 10);
  }, [win]);

  // The server owns filtering/sorting/pagination — the panel is a window onto the
  // same query the list pages use, so results stay correct beyond the first page.
  const listParams = useMemo(
    () => ({
      page: 1,
      limit: LIST_LIMIT,
      search: q,
      specialization: spec,
      hospital,
      status: tab === 'all' ? '' : tab,
      createdFrom,
      sort,
    }),
    [q, spec, hospital, tab, createdFrom, sort]
  );

  const {
    data: doctors,
    meta: listMeta,
    loading: l4,
    error: e4,
    refetch: r4,
  } = useApi('/api/doctors', listParams);

  // The metric strips show the last four months; the analytics chart shows all twelve.
  const months = useMemo(() => (monthly?.series || []).slice(-4), [monthly]);
  const yearMonths = useMemo(
    () => (monthly?.series || []).map((m) => ({ key: m.key, label: m.label, count: m.patients || 0 })),
    [monthly]
  );

  const byCondition = useMemo(
    () => Object.fromEntries((conditions || []).map((c) => [c.condition, c.count])),
    [conditions]
  );

  const list = doctors || [];
  // Nothing is selected on load: the panel opens on practice-wide analytics.
  const selected = list.find((d) => d._id === selectedId) || null;

  /** Month groups for one series, with up to two people actually added that month. */
  const groupsFor = (metric, people) => {
    const max = Math.max(...months.map((m) => m[metric]), 1);
    return months.map((m) => ({
      key: m.key,
      label: m.label,
      filled: Math.round((m[metric] / max) * SEGMENTS),
      people: (people || []).filter((p) => monthKeyOf(p.createdAt) === m.key).slice(0, 2),
    }));
  };

  if (e1) return <ErrorState message={e1.message} onRetry={r1} />;
  if (e2) return <ErrorState message={e2.message} onRetry={r2} />;
  if (e3) return <ErrorState message={e3.message} onRetry={r3} />;
  if (l1 || l2 || l3) return <LoadingTable rows={6} cols={4} />;
  if (!overview) return <ErrorState message="No analytics available." onRetry={r1} />;

  const totalPatients = overview.totalPatients;
  const critical = byCondition.Critical ?? 0;
  const serious = byCondition.Serious ?? 0;
  const observation = byCondition['Under Observation'] ?? 0;
  const avgCaseload = overview.totalDoctors ? (totalPatients / overview.totalDoctors).toFixed(1) : '0';
  const inactiveCount = Math.max(overview.totalDoctors - overview.activeDoctors, 0);
  const busiest = (overview.patientsPerDoctor || []).slice(0, 3);
  const activeFilterCount = [spec, hospital, q].filter(Boolean).length + (win !== 'any' ? 1 : 0);

  const registeredMonths = selected
    ? Math.max(
        1,
        Math.round((Date.now() - new Date(selected.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4))
      )
    : 0;
  const code = selected ? `DT-${String(selected._id).slice(-4).toUpperCase()}` : '—';

  const doctorPeople = list.map((d) => ({ ...d, kind: 'doctor' }));
  const patientPeople = (recentPatients || []).map((p) => ({ ...p, kind: 'patient' }));
  const caseloadPeople = busiest.map((d) => ({ ...d, kind: 'doctor' }));

  const columns = [
    {
      label: 'Doctors',
      value: overview.totalDoctors,
      suffix: `${overview.activeDoctors} active`,
      groups: groupsFor('doctors', doctorPeople),
    },
    {
      label: 'Patients',
      value: totalPatients,
      suffix: 'on record',
      groups: groupsFor('patients', patientPeople),
    },
    {
      label: 'Average caseload',
      value: avgCaseload,
      suffix: 'per doctor',
      groups: groupsFor('patients', caseloadPeople),
    },
  ];

  const detailTiles = selected
    ? [
        {
          value: selected.patientCount ?? 0,
          label: 'Patients under care',
          href: `/doctors/${selected._id}`,
        },
        { value: `${registeredMonths} mo`, label: 'On the register' },
        { value: selected.status === 'active' ? 'Active' : 'Inactive', label: 'Account status' },
      ]
    : [];

  const attention = [
    { label: 'Under observation', value: observation, condition: 'Under Observation' },
    { label: 'Critical', value: critical, condition: 'Critical', highlight: true },
    { label: 'Serious', value: serious, condition: 'Serious' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Title — kept compact and right-aligned to leave the vertical
          space to the data itself. */}
      <div className="flex shrink-0 items-center gap-3 pb-3">
        <div className="ml-auto flex items-center gap-3">
          <h1 className="text-[13px] font-medium tracking-[-0.01em] text-ink-2">Dashboard</h1>
          <button className="btn-secondary h-9" onClick={() => setAdding(true)}>
            {Icon.plus({ size: 13 })} Add doctor
          </button>
        </div>
      </div>

      {/* Metric strip + attention */}
      <div className="grid shrink-0 gap-3 sm:gap-4 lg:grid-cols-[1.9fr_1fr]">
        <section className="card grid gap-7 p-5 sm:grid-cols-3 sm:gap-6">
          {columns.map((c) => (
            <MetricColumn key={c.label} {...c} />
          ))}
        </section>

        <section className="card flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] font-medium text-ink-2">Needs attention</p>
            <Link
              href="/patients?condition=Critical"
              aria-label="Open critical patients"
              className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:text-ink"
            >
              {Icon.arrowUpRight({ size: 12 })}
            </Link>
          </div>

          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-normal leading-none tracking-[-0.03em] text-ink tnum sm:text-[32px]">
              {critical}
            </span>
            <span className="text-[12px] text-ink-3">critical</span>
          </p>

          <div className="mt-auto grid grid-cols-3 gap-2 pt-5 sm:gap-2.5">
            {attention.map((a) => (
              <Link
                key={a.label}
                href={`/patients?condition=${encodeURIComponent(a.condition)}`}
                className={`flex min-h-[84px] flex-col justify-between rounded-[13px] px-3 py-3 transition-transform hover:-translate-y-0.5 ${
                  a.highlight ? '-my-1.5 bg-accent' : 'bg-panel-2'
                }`}
              >
                <p className={`text-[16px] font-semibold tnum ${a.highlight ? 'text-accent-ink' : 'text-ink'}`}>
                  {a.value}
                </p>
                <p
                  className={`text-[10px] leading-tight ${
                    a.highlight ? 'text-accent-ink/80' : 'text-ink-3'
                  }`}
                >
                  {a.label}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Link href="/patients" className="btn-secondary h-9">
              View patients
            </Link>
            <Link href="/patients?condition=Critical" className="btn-primary h-9">
              Review now
            </Link>
          </div>
        </section>
      </div>

      {/* Filters — one full-width row: label, dropdowns, status switch, search. */}
      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 pr-1 text-[12.5px] font-medium text-ink">
          Active filters
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[9.5px] font-semibold text-canvas">
            {activeFilterCount}
          </span>
        </span>

        <select className="pill-select" value={spec} onChange={(e) => setSpec(e.target.value)} aria-label="Specialization">
          <option value="">All specializations</option>
          {(filterOptions?.specializations || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select className="pill-select" value={hospital} onChange={(e) => setHospital(e.target.value)} aria-label="Hospital">
          <option value="">All hospitals</option>
          {(filterOptions?.hospitals || []).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <select className="pill-select" value={win} onChange={(e) => setWin(e.target.value)} aria-label="Registration window">
          <option value="any">Any time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>

        <select className="pill-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort doctors">
          <option value="newest">Newest first</option>
          <option value="name">Name (A-Z)</option>
          <option value="oldest">Oldest first</option>
        </select>

        <div
          className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface p-1"
          role="group"
          aria-label="Filter by status"
        >
          {[
            { key: 'all', label: 'All', count: overview.totalDoctors },
            { key: 'active', label: 'Active', count: overview.activeDoctors },
            { key: 'inactive', label: 'Inactive', count: inactiveCount },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`h-7 rounded-full px-2.5 text-[12px] font-medium transition-colors sm:px-3 ${
                tab === t.key ? 'bg-accent text-accent-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              {t.label}
              <span className="ml-1 text-[9.5px] opacity-70 tnum">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[180px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-3">
            {Icon.search({ size: 14 })}
          </span>
          <input
            className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-[12.5px] text-ink outline-none placeholder:text-ink-3 focus:border-accent-hover focus:ring-4 focus:ring-accent/25"
            placeholder="Search doctors by name, hospital or specialization"
            value={qInput}
            onChange={(e) => {
              setQInput(e.target.value);
              applySearch(e.target.value);
            }}
            aria-label="Search doctors"
          />
        </div>
      </div>

      {/* Doctor block + detail */}
      <div className="mt-3 grid min-h-0 gap-3 sm:gap-4 lg:flex-1 lg:grid-cols-[1.35fr_1fr]">
        <section className="invert-panel relative flex min-h-[430px] flex-col rounded-[18px] px-2.5 pb-3 pt-3.5 lg:min-h-0">
          <div className="flex items-center justify-between px-2.5 pb-2.5">
            <h2 className="text-[13px] font-semibold text-ink">Doctors</h2>
            <span className="text-[11px] text-ink-3 tnum">
              {list.length}
              {listMeta?.total != null && listMeta.total > list.length ? ` of ${listMeta.total}` : ''} shown
            </span>
          </div>

          {e4 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center">
              <p className="text-[12px] text-ink-3">{e4.message}</p>
              <button type="button" onClick={r4} className="text-[12px] font-semibold text-ink underline">
                Try again
              </button>
            </div>
          ) : l4 ? (
            <div className="space-y-1.5 px-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-11 rounded-[11px]" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12px] text-ink-3">No doctors match these filters.</p>
          ) : (
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
              {list.map((d) => (
                <DoctorRow
                  key={d._id}
                  doctor={d}
                  selected={selected?._id === d._id}
                  onSelect={() => setSelectedId(d._id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="detail-panel flex min-h-[430px] flex-col rounded-[18px] p-4 lg:min-h-0">
          {!selected ? (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-white/60">Practice analytics</p>
                  <p className="mt-1 text-[20px] font-medium tracking-[-0.02em] text-white tnum sm:text-[22px]">
                    {totalPatients}
                    <span className="ml-1.5 text-[11px] font-normal text-white/55">patients</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/70">
                  {overview.totalDoctors} doctors
                </span>
              </div>

              <div className="mt-3 flex min-h-[112px] flex-1 flex-col">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] text-white/60">Patients added</p>
                  <p className="text-[10px] text-white/40">last 12 months</p>
                </div>
                <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
                  <DoctorActivityChart months={yearMonths} emptyLabel="No patients added yet" />
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] text-white/60">Condition mix</p>
                <ConditionDonut data={conditions || []} />
              </div>

              <p className="mt-3 text-[10.5px] leading-snug text-white/40">
                Select a doctor on the left to see their own activity.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] text-white/60">Doctor details</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-[20px] font-medium tracking-[-0.02em] text-white sm:text-[22px]">{code}</p>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium capitalize text-white">
                      {selected.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-5 sm:gap-6">
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60">Hospital</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="max-w-[170px] truncate text-[13.5px] text-white sm:max-w-[190px] sm:text-[14px]">
                        {selected.hospital}
                      </p>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20 text-[9px] font-semibold text-white">
                        {selected.hospital?.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60">Doctor</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Avatar id={selected._id} name={selected.name} kind="doctor" size={26} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-white">{selected.name}</p>
                        <p className="truncate text-[10px] text-white/60">{selected.specialization}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4">
                {detailTiles.map((c) =>
                  c.href ? (
                    <Link
                      key={c.label}
                      href={c.href}
                      className="detail-card relative flex min-h-[84px] flex-col justify-between rounded-[13px] p-3.5 transition-colors hover:bg-white/[0.09]"
                    >
                      <span className="absolute right-2.5 top-2.5 text-white/40">
                        {Icon.arrowUpRight({ size: 10 })}
                      </span>
                      <p className="text-[15px] font-medium text-white tnum">{c.value}</p>
                      <p className="mt-2 text-[10px] leading-tight text-white/60">{c.label}</p>
                    </Link>
                  ) : (
                    <div
                      key={c.label}
                      className="detail-card flex min-h-[84px] flex-col justify-between rounded-[13px] p-3.5"
                    >
                      <p className="text-[15px] font-medium text-white tnum">{c.value}</p>
                      <p className="mt-2 text-[10px] leading-tight text-white/60">{c.label}</p>
                    </div>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  aria-label="Add doctor"
                  className="tile-add grid min-h-[84px] place-items-center rounded-[13px] text-white/70 transition hover:text-white"
                >
                  {Icon.plus({ size: 14 })}
                </button>
              </div>

              {/* Live activity chart — the panel's flexible middle */}
              <div className="mt-4 flex min-h-[132px] flex-1 flex-col">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] text-white/60">Patients added</p>
                  <p className="text-[10px] text-white/40">last 6 months</p>
                </div>
                <div className="mt-1.5 flex min-h-0 flex-1 flex-col">
                  <DoctorStats doctorId={selected._id} />
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-stretch gap-2 pt-4">
                <div className="flex min-w-0 flex-1 gap-2">
                  <div className="detail-strip min-w-0 flex-[2] rounded-[11px] px-2.5 py-2">
                    <p className="text-[9.5px] text-white/55">Email</p>
                    <p className="truncate text-[10.5px] text-white">{selected.email}</p>
                  </div>
                  <div className="detail-strip hidden min-w-0 flex-[1.1] rounded-[11px] px-2 py-2 sm:block">
                    <p className="text-[9.5px] text-white/55">Phone</p>
                    <p className="truncate text-[10.5px] text-white tnum">{selected.phone}</p>
                  </div>
                  <div className="detail-strip hidden min-w-0 flex-[0.95] rounded-[11px] px-2 py-2 xl:block">
                    <p className="text-[9.5px] text-white/55">Added</p>
                    <p className="truncate text-[10.5px] text-white tnum">{formatDate(selected.createdAt)}</p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <a
                    href={`mailto:${selected.email}`}
                    aria-label="Email doctor"
                    className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {Icon.mail({ size: 13 })}
                  </a>
                  <a
                    href={`tel:${selected.phone}`}
                    aria-label="Call doctor"
                    className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {Icon.phone({ size: 13 })}
                  </a>
                  <Link href={`/doctors/${selected._id}`} className="btn-primary ml-1 h-9">
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <DoctorFormModal
        open={adding}
        doctor={null}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          r4();
          r1();
          r3();
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Protected>
      <DashboardBody />
    </Protected>
  );
}
