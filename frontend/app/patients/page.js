'use client';

/**
 * Patients page: global patient list with search, filters
 * (condition, status, assigned doctor, date range), pagination, edit and delete.
 */
import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Pagination from '@/components/Pagination';
import PatientFormModal from '@/components/PatientFormModal';
import { Icon } from '@/components/icons';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { PageHeader, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { formatDate, CONDITION_STYLES, STATUS_STYLES, GENDER_LABELS, debounce } from '@/lib/utils';

function PatientsBody() {
  const router = useRouter();
  const sp = useSearchParams();

  const page = Math.max(Number(sp.get('page')) || 1, 1);
  const limit = Number(sp.get('limit')) || 10;
  const search = sp.get('search') || '';
  const condition = sp.get('condition') || '';
  const status = sp.get('status') || '';
  const doctor = sp.get('doctor') || '';
  const createdFrom = sp.get('createdFrom') || '';
  const createdTo = sp.get('createdTo') || '';
  const sort = sp.get('sort') || 'newest';

  const params = useMemo(
    () => ({ page, limit, search, condition, status, doctor, createdFrom, createdTo, sort }),
    [page, limit, search, condition, status, doctor, createdFrom, createdTo, sort]
  );

  const { data: patients, meta, loading, error, refetch } = useApi('/api/patients', params);
  const { data: patientMeta } = useApi('/api/patients/meta');

  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const setParam = useCallback(
    (patch) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in patch)) next.delete('page');
      router.replace(`/patients?${next.toString()}`, { scroll: false });
    },
    [sp, router]
  );

  const debouncedSearch = debounce((v) => setParam({ search: v }), 350);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/patients/${deleting._id}`);
      setDeleting(null);
      refetch();
    } catch (err) {
      alert(err.message || 'Delete failed');
      setDeleting(null);
    }
  };

  const activeFilters = search || condition || status || doctor || createdFrom || createdTo;

  return (
    <>
      <PageHeader
        title="Patients"
        meta={meta ? `${meta.total} on record` : undefined}
        actions={
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            {Icon.userPlus({ size: 15 })} Add patient
          </button>
        }
      />

      {/* Filter toolbar */}
      <div className="panel mb-4 flex flex-col gap-3 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sand-500">
              {Icon.search({ size: 15 })}
            </span>
            <input
              className="input pl-8"
              defaultValue={search}
              placeholder="Search patient name or notes"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={condition} onChange={(e) => setParam({ condition: e.target.value })} aria-label="Filter by condition">
            <option value="">All conditions</option>
            {(patientMeta?.conditions || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => setParam({ status: e.target.value })} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="follow-up">Follow-up</option>
          </select>
          <select className="input w-auto max-w-[240px]" value={doctor} onChange={(e) => setParam({ doctor: e.target.value })} aria-label="Filter by assigned doctor">
            <option value="">All doctors</option>
            {(patientMeta?.doctors || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
            ))}
          </select>
          <select className="input w-auto" value={sort} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sort order">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A-Z)</option>
            <option value="age">Age (high to low)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3 text-xs text-ink-600">
          <span className="uppercase tracking-[0.08em]">Registered between</span>
          <input type="date" className="input w-auto px-2 py-1 text-xs" value={createdFrom} onChange={(e) => setParam({ createdFrom: e.target.value })} aria-label="Registered from" />
          <span>and</span>
          <input type="date" className="input w-auto px-2 py-1 text-xs" value={createdTo} onChange={(e) => setParam({ createdTo: e.target.value })} aria-label="Registered to" />
          {activeFilters && (
            <button onClick={() => router.replace('/patients')} className="ml-auto flex items-center gap-1 font-medium text-spruce-700 hover:underline">
              {Icon.close({ size: 12 })} Clear filters
            </button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingTable rows={6} cols={6} />
      ) : !patients || patients.length === 0 ? (
        <EmptyState
          title="No patients match these filters"
          hint="Clear the filters, or add the first patient."
          action={
            <button className="btn-primary mt-2" onClick={() => { setEditing(null); setShowModal(true); }}>
              {Icon.userPlus({ size: 15 })} Add patient
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="th">Patient</th>
                <th className="th hidden sm:table-cell">Age / gender</th>
                <th className="th">Condition</th>
                <th className="th">Doctor</th>
                <th className="th hidden md:table-cell">Status</th>
                <th className="th hidden lg:table-cell">Registered</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p._id} className="transition hover:bg-sand-100/70">
                  <td className="td">
                    <p className="font-medium text-ink-900">{p.name}</p>
                    <p className="font-mono text-xs text-sand-500">{p.phone || p.email || 'no contact'}</p>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className="font-mono">{p.age}</span> <span className="text-sand-500">/ {GENDER_LABELS[p.gender]}</span>
                  </td>
                  <td className="td">
                    <span className={`dot-badge ${CONDITION_STYLES[p.condition]}`}>{p.condition}</span>
                  </td>
                  <td className="td">
                    {p.doctor ? (
                      <Link href={`/doctors/${p.doctor._id}`} className="text-spruce-700 hover:underline">
                        {p.doctor.name}
                      </Link>
                    ) : (
                      <span className="text-sand-500">unassigned</span>
                    )}
                    <p className="hidden text-xs text-sand-500 xl:block">{p.doctor?.specialization}</p>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`dot-badge ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="td hidden lg:table-cell font-mono text-sm">{formatDate(p.createdAt)}</td>
                  <td className="td text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Edit patient"
                        onClick={() => { setEditing(p); setShowModal(true); }}
                        className="rounded-[3px] p-1.5 text-sand-500 transition hover:bg-sand-100 hover:text-ink-700"
                      >
                        {Icon.pen({ size: 15 })}
                      </button>
                      <button
                        title="Delete patient"
                        onClick={() => setDeleting(p)}
                        className="rounded-[3px] p-1.5 text-sand-500 transition hover:bg-brick-50 hover:text-brick-600"
                      >
                        {Icon.trash({ size: 15 })}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            limit={limit}
            total={meta?.total || 0}
            totalPages={meta?.totalPages || 1}
            onPage={(p) => setParam({ page: p })}
            onLimit={(l) => setParam({ limit: l, page: 1 })}
          />
        </div>
      )}

      <PatientFormModal
        open={showModal}
        patient={editing}
        doctors={patientMeta?.doctors?.map((d) => ({ _id: d.id, name: d.name, specialization: d.specialization })) || []}
        onClose={() => setShowModal(false)}
        onSaved={() => {
          setShowModal(false);
          refetch();
        }}
      />

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setDeleting(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-md border border-hairline-strong bg-sand-50 p-6 shadow-raised">
            <h2 className="text-base font-semibold text-ink-900">Delete patient</h2>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-ink-900">{deleting.name}</span> will be permanently deleted.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Delete patient</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PatientsPage() {
  return (
    <Protected>
      <PatientsBody />
    </Protected>
  );
}
