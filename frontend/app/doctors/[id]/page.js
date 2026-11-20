'use client';

/**
 * Doctor detail page: profile block + the doctor's own patient list
 * (view / add / delete patients under a specific doctor).
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Protected from '@/components/Protected';
import Pagination from '@/components/Pagination';
import PatientFormModal from '@/components/PatientFormModal';
import DoctorFormModal from '@/components/DoctorFormModal';
import { AnimatePresence, motion } from 'motion/react';
import useFocusTrap from '@/lib/useFocusTrap';
import { Icon } from '@/components/icons';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { PageHeader, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { springs } from '@/components/motion-kit';
import { formatDate, formatDateTime, CONDITION_STYLES, STATUS_STYLES, GENDER_LABELS, debounce } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import BackButton from '@/components/BackButton';

function DetailRow({ icon: Ico, label, children }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line py-2.5 last:border-b-0">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {Ico && Ico({ size: 13 })}
        {label}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-sm text-ink">{children}</span>
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
  const confirmRef = useRef(null);
  useFocusTrap(confirmRef, !!deletingPatient, () => setDeletingPatient(null));

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
        <PageHeader back title="Doctor not found" />
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
        <BackButton fallback="/doctors" label="Back to doctors" />
      </div>

      {loadingDoctor || !doctor ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card skeleton mb-6 h-44"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.08 }}
          whileHover={{ y: -2 }}
          className="detail-panel panel mb-6 p-6"
        >
          <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar id={doctor._id} name={doctor.name} kind="doctor" size={56} radius={14} className="ring-1 ring-white/15" />
              <div>
                <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-ink">{doctor.name}</h1>
                <p className="mt-0.5 text-sm text-ink-3">
                  {doctor.specialization} · {doctor.hospital}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`badge ${STATUS_STYLES[doctor.status]}`}>{doctor.status}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">
                    {Icon.users({ size: 12 })}
                    <span className="font-mono tnum">{meta?.total ?? '…'}</span> patients
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-primary" onClick={() => setShowEditDoctor(true)}>
                {Icon.pen({ size: 14 })} Edit profile
              </button>
            </div>
          </div>

          <dl className="mt-2 grid gap-x-10 rounded-inner border border-line bg-surface-2/50 px-4 py-1 sm:grid-cols-2">
            <div>
              <DetailRow icon={Icon.mail} label="Email">
                <a href={`mailto:${doctor.email}`} className="font-medium text-ink underline decoration-ink/30 underline-offset-4 transition hover:decoration-ink">{doctor.email}</a>
              </DetailRow>
              <DetailRow icon={Icon.phone} label="Phone">
                <span className="font-mono tnum">{doctor.phone}</span>
              </DetailRow>
            </div>
            <div>
              <DetailRow icon={Icon.fee} label="Fee">
                <span className="font-mono font-semibold tnum">BDT {doctor.consultationFee || 0}</span>
                <span className="text-xs text-ink-3">per consultation</span>
              </DetailRow>
              <DetailRow icon={Icon.calendar} label="Since">
                <span className="font-mono tnum">{formatDate(doctor.createdAt)}</span>
              </DetailRow>
            </div>
          </dl>
        </motion.div>
      )}

      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Patients</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {meta ? `${meta.total} under ${doctor?.name || 'this doctor'}` : `Under ${doctor?.name || 'this doctor'}`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowPatientModal(true)}>
          {Icon.userPlus({ size: 15 })} Add patient
        </button>
      </div>

      {/* Patient filters */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.soft, delay: 0.14 }}
        className="card mb-4 flex flex-wrap items-center gap-2 p-3"
      >
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">
            {Icon.search({ size: 15 })}
          </span>
          <input
            className="input h-9 rounded-full pl-9"
            defaultValue={search}
            placeholder="Search patient name"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
        <select className="pill-select" value={condition} onChange={(e) => setParam({ condition: e.target.value })} aria-label="Filter by condition">
          <option value="">All conditions</option>
          {Object.keys(CONDITION_STYLES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </motion.div>

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.2 }}
          className="table-wrap invert-panel"
        >
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
              {patients.map((pt, i) => (
                <motion.tr
                  key={pt._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springs.soft, delay: 0.22 + i * 0.045 }}
                  className="group transition-colors duration-150 hover:bg-surface-2/60"
                >
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar id={pt._id} name={pt.name} kind="patient" size={30} />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{pt.name}</p>
                        <p className="truncate font-mono text-xs text-ink-3 tnum">{pt.phone || 'no phone'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className="font-mono tnum">{pt.age}</span> <span className="text-ink-3">/ {GENDER_LABELS[pt.gender]}</span>
                  </td>
                  <td className="td">
                    <span className={`badge ${CONDITION_STYLES[pt.condition]}`}>{pt.condition}</span>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`badge ${STATUS_STYLES[pt.status]}`}>{pt.status}</span>
                  </td>
                  <td className="td hidden lg:table-cell font-mono text-[13px] text-ink-3 tnum">{formatDateTime(pt.createdAt)}</td>
                  <td className="td text-right">
                    <div className="inline-flex items-center gap-0.5 text-ink-3 transition duration-150 group-hover:text-ink">
                      <motion.button
                        title="Remove patient"
                        whileHover={{ scale: 1.12, rotate: 4 }}
                        whileTap={{ scale: 0.9 }}
                        transition={springs.bouncy}
                        onClick={() => setDeletingPatient(pt)}
                        className="icon-btn icon-btn-danger"
                      >
                        {Icon.trash({ size: 15 })}
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
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
        </motion.div>
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

      <AnimatePresence>
        {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setDeletingPatient(null)}
          />
          <motion.div
            ref={confirmRef}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={springs.soft}
            className="relative z-10 w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-pop">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-danger-soft text-danger">{Icon.trash({ size: 18 })}</span>
              <h2 className="text-base font-semibold text-ink">Remove patient</h2>
            </div>
            <p className="text-sm leading-relaxed text-ink-2">
              <span className="font-semibold text-ink">{deletingPatient.name}</span> will be removed from this
              doctor's list. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={springs.snappy}
                className="btn-secondary"
                onClick={() => setDeletingPatient(null)}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={springs.bouncy}
                className="btn-danger"
                onClick={confirmDeletePatient}
              >
                Remove patient
              </motion.button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
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
