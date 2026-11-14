'use client';

/**
 * Doctor detail page: profile block + the doctor's own patient list
 * (view / add / delete patients under a specific doctor).
 */
import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Pagination from '@/components/Pagination';
import PatientFormModal from '@/components/PatientFormModal';
import DoctorFormModal from '@/components/DoctorFormModal';
import { Icon } from '@/components/icons';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { PageHeader, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { formatDate, formatDateTime, CONDITION_STYLES, STATUS_STYLES, GENDER_LABELS, debounce } from '@/lib/utils';

function DetailRow({ icon, label, children }) {
  const Ico = icon;
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-hairline last:border-b-0">
      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-sand-500">{label}</span>
      <span className="flex items-center gap-2 min-w-0 text-sm text-ink-800">{children}</span>
    </div>
  );
}

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
          <Link href="/doctors" className="btn-secondary">{Icon.arrowLeft({ size: 15 })} Back to doctors</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link href="/doctors" className="inline-flex items-center gap-1.5 text-sm font-medium text-spruce-700 hover:underline">
          {Icon.arrowLeft({ size: 14 })} All doctors
        </Link>
      </div>

      {loadingDoctor || !doctor ? (
        <div className="panel mb-6 h-40 animate-pulse" />
      ) : (
        <div className="panel mb-6 p-6">
          <div className="flex flex-col gap-4 border-b border-hairline pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{doctor.name}</h1>
              <p className="mt-0.5 text-sm text-ink-600">
                {doctor.specialization} at {doctor.hospital}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`dot-badge ${STATUS_STYLES[doctor.status]}`}>{doctor.status}</span>
              <button className="btn-secondary" onClick={() => setShowEditDoctor(true)}>
                {Icon.pen({ size: 14 })} Edit profile
              </button>
            </div>
          </div>

          <dl className="mt-2">
            <DetailRow icon={Icon.mail} label="Email">
              <a href={`mailto:${doctor.email}`} className="text-spruce-700 hover:underline">{doctor.email}</a>
            </DetailRow>
            <DetailRow icon={Icon.phone} label="Phone">
              <span className="font-mono">{doctor.phone}</span>
            </DetailRow>
            <DetailRow icon={Icon.fee} label="Fee">
              <span className="font-mono">BDT {doctor.consultationFee || 0}</span>
              <span className="text-xs text-sand-500">per consultation</span>
            </DetailRow>
            <DetailRow icon={Icon.calendar} label="Since">
              <span className="font-mono">{formatDate(doctor.createdAt)}</span>
            </DetailRow>
            <DetailRow icon={Icon.users} label="Caseload">
              <span className="font-mono font-semibold text-ink-900">{meta?.total ?? '…'}</span>
              <span className="text-xs text-sand-500">patients on record</span>
            </DetailRow>
          </dl>
        </div>
      )}

      <PageHeader
        title="Patients"
        meta={`Under ${doctor?.name || 'this doctor'}`}
        actions={
          <button className="btn-primary" onClick={() => setShowPatientModal(true)}>
            {Icon.userPlus({ size: 15 })} Add patient
          </button>
        }
      />

      {/* Patient filters */}
      <div className="panel mb-4 flex flex-wrap items-center gap-2 p-3.5">
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sand-500">
            {Icon.search({ size: 15 })}
          </span>
          <input
            className="input pl-8"
            defaultValue={search}
            placeholder="Search patient name"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={condition} onChange={(e) => setParam({ condition: e.target.value })} aria-label="Filter by condition">
          <option value="">All conditions</option>
          {Object.keys(CONDITION_STYLES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {errorPatients ? (
        <ErrorState message={errorPatients.message} onRetry={refetchPatients} />
      ) : loadingPatients ? (
        <LoadingTable rows={5} cols={5} />
      ) : !patients || patients.length === 0 ? (
        <EmptyState
          title="No patients on this list"
          hint="This doctor has no patients, or none match the filters."
          action={
            <button className="btn-primary mt-2" onClick={() => setShowPatientModal(true)}>
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
                    <p className="font-mono text-xs text-sand-500">{p.phone || 'no phone'}</p>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className="font-mono">{p.age}</span> <span className="text-sand-500">/ {GENDER_LABELS[p.gender]}</span>
                  </td>
                  <td className="td">
                    <span className={`dot-badge ${CONDITION_STYLES[p.condition]}`}>{p.condition}</span>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`dot-badge ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="td hidden lg:table-cell font-mono text-sm">{formatDateTime(p.createdAt)}</td>
                  <td className="td text-right">
                    <button
                      title="Remove patient"
                      onClick={() => setDeletingPatient(p)}
                      className="rounded-[3px] p-1.5 text-sand-500 transition hover:bg-brick-50 hover:text-brick-600"
                    >
                      {Icon.trash({ size: 15 })}
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
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setDeletingPatient(null)} />
          <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-md border border-hairline-strong bg-sand-50 p-6 shadow-raised">
            <h2 className="text-base font-semibold text-ink-900">Remove patient</h2>
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-ink-900">{deletingPatient.name}</span> will be removed from this
              doctor's list. This action cannot be undone.
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
