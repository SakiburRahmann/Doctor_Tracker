'use client';

/**
 * Doctor detail page — profile card + the doctor's own patient list
 * (view / add / delete patients under a specific doctor).
 */
import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Pagination from '@/components/Pagination';
import PatientFormModal from '@/components/PatientFormModal';
import DoctorFormModal from '@/components/DoctorFormModal';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { PageHeader, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { formatDate, formatDateTime, CONDITION_STYLES, STATUS_STYLES, GENDER_LABELS, debounce } from '@/lib/utils';

function DoctorDetailBody() {
  const { id } = useParams();
  const router = useRouter();
  const sp = useSearchParams();

  const page = Math.max(Number(sp.get('page')) || 1, 1);
  const limit = Number(sp.get('limit')) || 10;
  const search = sp.get('search') || '';
  const condition = sp.get('condition') || '';

  const { data: doctor, loading: loadingDoctor, error: errorDoctor, refetch: refetchDoctor } = useApi(`/api/doctors/${id}`);
  const patientParams = useMemo(() => ({ page, limit, search, condition }), [page, limit, search, condition]);
  const { data: patients, meta, loading: loadingPatients, error: errorPatients, refetch: refetchPatients } =
    useApi(`/api/doctors/${id}/patients`, patientParams);
  const { data: allActive } = useApi('/api/doctors', { limit: 100, status: 'active', sort: 'name' });

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showEditDoctor, setShowEditDoctor] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(null);

  const setParam = useCallback(
    (patch) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in patch)) next.delete('page');
      router.replace(`/doctors/${id}?${next.toString()}`, { scroll: false });
    },
    [sp, router, id]
  );

  const debouncedSearch = debounce((v) => setParam({ search: v }), 350);

  const confirmDeletePatient = async () => {
    if (!deletingPatient) return;
    try {
      await api.delete(`/api/patients/${deletingPatient._id}`);
      setDeletingPatient(null);
      refetchPatients();
      refetchDoctor();
    } catch (err) {
      alert(err.message || 'Delete failed');
      setDeletingPatient(null);
    }
  };

  if (errorDoctor) {
    return (
      <>
        <PageHeader title="Doctor not found" />
        <ErrorState message={errorDoctor.message} />
        <div className="mt-4">
          <Link href="/doctors" className="btn-secondary">← Back to doctors</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link href="/doctors" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to all doctors
        </Link>
      </div>

      {loadingDoctor || !doctor ? (
        <div className="card mb-6 h-40 animate-pulse" />
      ) : (
        <div className="card mb-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                {doctor.name.replace('Dr. ', '').charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{doctor.name}</h1>
                <p className="text-sm text-slate-500">
                  {doctor.specialization} · {doctor.hospital}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>✉ {doctor.email}</span>
                  <span>☎ {doctor.phone}</span>
                  {doctor.consultationFee > 0 && <span>৳{doctor.consultationFee} consultation</span>}
                  <span>Since {formatDate(doctor.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${STATUS_STYLES[doctor.status]}`}>{doctor.status}</span>
              <button className="btn-secondary" onClick={() => setShowEditDoctor(true)}>Edit profile</button>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Managing <span className="font-semibold text-slate-800">{meta?.total ?? '…'}</span> patient
              {meta?.total === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      )}

      <PageHeader
        title="Patients"
        subtitle={`Patient list for ${doctor?.name || 'this doctor'}`}
        actions={
          <button className="btn-primary" onClick={() => setShowPatientModal(true)}>
            + Add patient
          </button>
        }
      />

      {/* Patient filters */}
      <div className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="label" htmlFor="dp-search">Search patients</label>
            <input
              id="dp-search"
              className="input"
              defaultValue={search}
              placeholder="Patient name…"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="dp-cond">Condition</label>
            <select id="dp-cond" className="input" value={condition} onChange={(e) => setParam({ condition: e.target.value })}>
              <option value="">All conditions</option>
              {Object.keys(CONDITION_STYLES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorPatients ? (
        <ErrorState message={errorPatients.message} onRetry={refetchPatients} />
      ) : loadingPatients ? (
        <LoadingTable rows={5} cols={5} />
      ) : !patients || patients.length === 0 ? (
        <EmptyState
          title="No patients found"
          hint="This doctor has no patients yet (or none match the filters)."
          action={
            <button className="btn-primary mt-2" onClick={() => setShowPatientModal(true)}>
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
                    <p className="text-xs text-slate-400">{p.phone || '—'}</p>
                  </td>
                  <td className="td hidden sm:table-cell">
                    {p.age} · {GENDER_LABELS[p.gender]}
                  </td>
                  <td className="td">
                    <span className={`badge ${CONDITION_STYLES[p.condition]}`}>{p.condition}</span>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`badge ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="td hidden lg:table-cell">{formatDateTime(p.createdAt)}</td>
                  <td className="td text-right">
                    <button
                      title="Delete patient"
                      onClick={() => setDeletingPatient(p)}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
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
        open={showPatientModal}
        doctors={doctor ? [doctor, ...(allActive || []).filter((d) => d._id !== doctor._id)] : allActive || []}
        defaultDoctorId={doctor?._id}
        onClose={() => setShowPatientModal(false)}
        onSaved={() => {
          setShowPatientModal(false);
          refetchPatients();
          refetchDoctor();
        }}
      />

      <DoctorFormModal
        open={showEditDoctor}
        doctor={doctor}
        onClose={() => setShowEditDoctor(false)}
        onSaved={() => {
          setShowEditDoctor(false);
          refetchDoctor();
        }}
      />

      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDeletingPatient(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Remove patient?</h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{deletingPatient.name}</span> will be removed from this doctor&apos;s
              patient list. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn-secondary" onClick={() => setDeletingPatient(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDeletePatient}>Remove patient</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DoctorDetailPage() {
  return (
    <Protected>
      <DoctorDetailBody />
    </Protected>
  );
}
