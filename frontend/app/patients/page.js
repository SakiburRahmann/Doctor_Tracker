'use client';

/**
 * Dedicated Patient page — global patient list with search, filters
 * (condition, status, assigned doctor, date-wise), pagination, edit and delete.
 */
import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Pagination from '@/components/Pagination';
import PatientFormModal from '@/components/PatientFormModal';
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
        subtitle="All patients across doctors — search, filter, edit or remove records."
        actions={
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            + Add patient
          </button>
        }
      />

      {/* Filter bar */}
      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="label" htmlFor="pf-q">Search</label>
            <input
              id="pf-q"
              className="input"
              defaultValue={search}
              placeholder="Patient name or notes…"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="pf-c">Condition</label>
            <select id="pf-c" className="input" value={condition} onChange={(e) => setParam({ condition: e.target.value })}>
              <option value="">All conditions</option>
              {(patientMeta?.conditions || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pf-s">Status</label>
            <select id="pf-s" className="input" value={status} onChange={(e) => setParam({ status: e.target.value })}>
              <option value="">Any status</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
              <option value="follow-up">Follow-up</option>
            </select>
          </div>
          <div className="xl:col-span-2">
            <label className="label" htmlFor="pf-d">Assigned doctor</label>
            <select id="pf-d" className="input" value={doctor} onChange={(e) => setParam({ doctor: e.target.value })}>
              <option value="">All doctors</option>
              {(patientMeta?.doctors || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pf-from">Registered from</label>
            <input id="pf-from" type="date" className="input" value={createdFrom} onChange={(e) => setParam({ createdFrom: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="pf-to">Registered to</label>
            <input id="pf-to" type="date" className="input" value={createdTo} onChange={(e) => setParam({ createdTo: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="pf-sort">Sort</label>
            <select id="pf-sort" className="input" value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="age">Age (high → low)</option>
            </select>
          </div>
        </div>
        {activeFilters && (
          <button onClick={() => router.replace('/patients')} className="mt-3 text-xs font-medium text-brand-600 hover:underline">
            ✕ Clear all filters
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingTable rows={6} cols={6} />
      ) : !patients || patients.length === 0 ? (
        <EmptyState
          title="No patients match your filters"
          hint="Try clearing the filters, or add a new patient."
          action={
            <button className="btn-primary mt-2" onClick={() => { setEditing(null); setShowModal(true); }}>
              + Add patient
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Patient</th>
                <th className="th hidden sm:table-cell">Age / Gender</th>
                <th className="th">Condition</th>
                <th className="th">Doctor</th>
                <th className="th hidden md:table-cell">Status</th>
                <th className="th hidden lg:table-cell">Registered</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {patients.map((p) => (
                <tr key={p._id} className="transition hover:bg-slate-50/70">
                  <td className="td">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.phone || p.email || '—'}</p>
                  </td>
                  <td className="td hidden sm:table-cell">
                    {p.age} · {GENDER_LABELS[p.gender]}
                  </td>
                  <td className="td">
                    <span className={`badge ${CONDITION_STYLES[p.condition]}`}>{p.condition}</span>
                  </td>
                  <td className="td">
                    {p.doctor ? (
                      <Link href={`/doctors/${p.doctor._id}`} className="text-brand-700 hover:underline">
                        {p.doctor.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                    <p className="hidden text-xs text-slate-400 xl:block">{p.doctor?.specialization}</p>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`badge ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="td hidden lg:table-cell">{formatDate(p.createdAt)}</td>
                  <td className="td text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Edit patient"
                        onClick={() => { setEditing(p); setShowModal(true); }}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        title="Delete patient"
                        onClick={() => setDeleting(p)}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDeleting(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Delete patient?</h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{deleting.name}</span> will be permanently deleted.
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
