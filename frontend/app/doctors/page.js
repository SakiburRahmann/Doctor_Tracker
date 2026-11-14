'use client';

/**
 * Doctors list page.
 * All list state lives in the URL (searchParams): shareable, refresh-safe,
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
import { Icon } from '@/components/icons';
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

  const activeFilters = search || specialization || hospital || status || createdFrom || createdTo;

  return (
    <>
      <PageHeader
        title="Doctors"
        meta={meta ? `${meta.total} on register` : undefined}
        actions={
          <button className="btn-primary" onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }}>
            {Icon.userPlus({ size: 15 })} Add doctor
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
              placeholder="Search name, specialization, hospital, or email"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={specialization} onChange={(e) => setParam({ specialization: e.target.value })} aria-label="Filter by specialization">
            <option value="">All specializations</option>
            {(doctorMeta?.specializations || []).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="input w-auto" value={hospital} onChange={(e) => setParam({ hospital: e.target.value })} aria-label="Filter by hospital">
            <option value="">All hospitals</option>
            {(doctorMeta?.hospitals || []).map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => setParam({ status: e.target.value })} aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="input w-auto" value={sort} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sort order">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3 text-xs text-ink-600">
          <span className="uppercase tracking-[0.08em]">Registered between</span>
          <input type="date" className="input w-auto px-2 py-1 text-xs" value={createdFrom} onChange={(e) => setParam({ createdFrom: e.target.value })} aria-label="Registered from" />
          <span>and</span>
          <input type="date" className="input w-auto px-2 py-1 text-xs" value={createdTo} onChange={(e) => setParam({ createdTo: e.target.value })} aria-label="Registered to" />
          {activeFilters && (
            <button onClick={() => router.replace('/doctors')} className="ml-auto flex items-center gap-1 font-medium text-spruce-700 hover:underline">
              {Icon.close({ size: 12 })} Clear filters
            </button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : loading ? (
        <LoadingTable rows={6} cols={5} />
      ) : !doctors || doctors.length === 0 ? (
        <EmptyState
          title="No doctors match these filters"
          hint="Clear the filters, or add the first doctor."
          action={
            <button className="btn-primary mt-2" onClick={() => { setEditingDoctor(null); setShowDoctorModal(true); }}>
              {Icon.userPlus({ size: 15 })} Add doctor
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="min-w-full">
            <thead>
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
            <tbody>
              {doctors.map((d) => (
                <tr key={d._id} className="transition hover:bg-sand-100/70">
                  <td className="td">
                    <Link href={`/doctors/${d._id}`} className="font-medium text-spruce-700 hover:underline">
                      {d.name}
                    </Link>
                    <p className="text-xs text-sand-500">{d.email}</p>
                  </td>
                  <td className="td">{d.specialization}</td>
                  <td className="td hidden md:table-cell">{d.hospital}</td>
                  <td className="td hidden lg:table-cell font-mono text-sm">{d.phone}</td>
                  <td className="td hidden sm:table-cell font-mono text-sm">{formatDate(d.createdAt)}</td>
                  <td className="td">
                    <span className={`dot-badge ${STATUS_STYLES[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="td text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Add patient for this doctor"
                        onClick={() => setAddPatientFor(d)}
                        className="rounded-[3px] p-1.5 text-sand-500 transition hover:bg-spruce-50 hover:text-spruce-700"
                      >
                        {Icon.userPlus({ size: 15 })}
                      </button>
                      <button
                        title="Edit doctor"
                        onClick={() => { setEditingDoctor(d); setShowDoctorModal(true); }}
                        className="rounded-[3px] p-1.5 text-sand-500 transition hover:bg-sand-100 hover:text-ink-700"
                      >
                        {Icon.pen({ size: 15 })}
                      </button>
                      <button
                        title="Delete doctor"
                        onClick={() => setDeleting(d)}
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
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setDeleting(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-md border border-hairline-strong bg-sand-50 p-6 shadow-raised">
            <h2 className="text-base font-semibold text-ink-900">Delete doctor</h2>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-ink-900">{deleting.name}</span> and{' '}
              <span className="font-medium text-ink-900">all of their patients</span> will be permanently removed.
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
