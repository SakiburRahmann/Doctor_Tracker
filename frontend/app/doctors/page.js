'use client';

/**
 * Doctors list page.
 * All list state lives in the URL (searchParams) — shareable, refresh-safe,
 * and back-button friendly. Search is debounced; every change triggers exactly
 * one API request thanks to the useApi dependency key.
 */
import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Pagination from '@/components/Pagination';
import DoctorFormModal from '@/components/DoctorFormModal';
import PatientFormModal from '@/components/PatientFormModal';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { PageHeader, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { formatDate, STATUS_STYLES, debounce } from '@/lib/utils';

function DoctorsBody() {
  const router = useRouter();
  const sp = useSearchParams();

  const page = Math.max(Number(sp.get('page')) || 1, 1);
  const limit = Number(sp.get('limit')) || 10;
  const search = sp.get('search') || '';
  const specialization = sp.get('specialization') || '';
  const hospital = sp.get('hospital') || '';
  const status = sp.get('status') || '';
  const createdFrom = sp.get('createdFrom') || '';
  const createdTo = sp.get('createdTo') || '';
  const sort = sp.get('sort') || 'newest';

  const params = useMemo(
    () => ({ page, limit, search, specialization, hospital, status, createdFrom, createdTo, sort }),
    [page, limit, search, specialization, hospital, status, createdFrom, createdTo, sort]
  );

  const { data: doctors, meta, loading, error, refetch } = useApi('/api/doctors', params);
  const { data: doctorMeta } = useApi('/api/doctors/meta');
  const { data: allActive } = useApi('/api/doctors', { limit: 100, status: 'active', sort: 'name' });

  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [addPatientFor, setAddPatientFor] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const setParam = useCallback(
    (patch, resetPage = true) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });
      if (resetPage && !('page' in patch)) next.delete('page');
      router.replace(`/doctors?${next.toString()}`, { scroll: false });
    },
    [sp, router]
  );

  const debouncedSearch = debounce((v) => setParam({ search: v }), 350);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/doctors/${deleting._id}`);
      setDeleting(null);
      refetch();
    } catch (err) {
      alert(err.message || 'Delete failed');
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Search, filter and manage all registered doctors."
        actions={
          <button className="btn-primary" onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }}>
            + Add doctor
          </button>
        }
      />

      {/* Filter bar */}
      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="label" htmlFor="f-search">Search</label>
            <input
              id="f-search"
              className="input"
              defaultValue={search}
              placeholder="Name, specialization, hospital or email…"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="f-spec">Specialization</label>
            <select id="f-spec" className="input" value={specialization} onChange={(e) => setParam({ specialization: e.target.value })}>
              <option value="">All specializations</option>
              {(doctorMeta?.specializations || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-hosp">Hospital</label>
            <select id="f-hosp" className="input" value={hospital} onChange={(e) => setParam({ hospital: e.target.value })}>
              <option value="">All hospitals</option>
              {(doctorMeta?.hospitals || []).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-status">Status</label>
            <select id="f-status" className="input" value={status} onChange={(e) => setParam({ status: e.target.value })}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-from">Added from</label>
            <input id="f-from" type="date" className="input" value={createdFrom} onChange={(e) => setParam({ createdFrom: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">Added to</label>
            <input id="f-to" type="date" className="input" value={createdTo} onChange={(e) => setParam({ createdTo: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="f-sort">Sort</label>
            <select id="f-sort" className="input" value={sort} onChange={(e) => setParam({ sort: e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>
        {(search || specialization || hospital || status || createdFrom || createdTo) && (
          <button onClick={() => router.replace('/doctors')} className="mt-3 text-xs font-medium text-brand-600 hover:underline">
            ✕ Clear all filters
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingTable rows={6} cols={5} />
      ) : !doctors || doctors.length === 0 ? (
        <EmptyState
          title="No doctors match your filters"
          hint="Try clearing the filters, or add your first doctor."
          action={
            <button className="btn-primary mt-2" onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }}>
              + Add doctor
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Doctor</th>
                <th className="th">Specialization</th>
                <th className="th hidden md:table-cell">Hospital</th>
                <th className="th hidden lg:table-cell">Contact</th>
                <th className="th hidden sm:table-cell">Added</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {doctors.map((d) => (
                <tr key={d._id} className="transition hover:bg-slate-50/70">
                  <td className="td">
                    <Link href={`/doctors/${d._id}`} className="font-medium text-brand-700 hover:underline">
                      {d.name}
                    </Link>
                    <p className="text-xs text-slate-400">{d.email}</p>
                  </td>
                  <td className="td">{d.specialization}</td>
                  <td className="td hidden md:table-cell">{d.hospital}</td>
                  <td className="td hidden lg:table-cell">{d.phone}</td>
                  <td className="td hidden sm:table-cell">{formatDate(d.createdAt)}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_STYLES[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="td text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Add patient"
                        onClick={() => setAddPatientFor(d)}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M19 8v6M22 11h-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        title="Edit doctor"
                        onClick={() => { setEditingDoctor(d); setShowDoctorModal(true); }}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        title="Delete doctor"
                        onClick={() => setDeleting(d)}
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
            onPage={(p) => setParam({ page: p }, false)}
            onLimit={(l) => setParam({ limit: l, page: 1 }, false)}
          />
        </div>
      )}

      {/* Modals */}
      <DoctorFormModal
        open={showDoctorModal}
        doctor={editingDoctor}
        onClose={() => setShowDoctorModal(false)}
        onSaved={() => {
          setShowDoctorModal(false);
          refetch();
        }}
      />

      <PatientFormModal
        open={!!addPatientFor}
        doctors={allActive || []}
        defaultDoctorId={addPatientFor?._id}
        onClose={() => setAddPatientFor(null)}
        onSaved={() => {
          setAddPatientFor(null);
          refetch();
        }}
      />

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDeleting(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Delete doctor?</h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{deleting.name}</span> and{' '}
              <span className="font-medium">all of their patients</span> will be permanently removed.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DoctorsPage() {
  return (
    <Protected>
      <DoctorsBody />
    </Protected>
  );
}
