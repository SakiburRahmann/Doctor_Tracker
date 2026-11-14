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
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@/components/icons';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { PageHeader, LoadingTable, ErrorState, EmptyState } from '@/components/ui';
import { springs } from '@/components/motion-kit';
import { formatDate, CONDITION_STYLES, STATUS_STYLES, GENDER_LABELS, initials, avatarTint, debounce } from '@/lib/utils';

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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.soft, delay: 0.1 }}
        className="panel mb-4 flex flex-col gap-3 p-3.5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-mist-400">
              {Icon.search({ size: 15 })}
            </span>
            <input
              className="input pl-9"
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
        <div className="flex flex-wrap items-center gap-2 border-t border-mist-150 pt-3 text-xs text-mist-500">
          <span className="font-semibold uppercase tracking-[0.08em]">Registered between</span>
          <input type="date" className="input w-auto px-2.5 py-1 text-xs" value={createdFrom} onChange={(e) => setParam({ createdFrom: e.target.value })} aria-label="Registered from" />
          <span>and</span>
          <input type="date" className="input w-auto px-2.5 py-1 text-xs" value={createdTo} onChange={(e) => setParam({ createdTo: e.target.value })} aria-label="Registered to" />
          <AnimatePresence>
            {activeFilters && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={springs.snappy}
                onClick={() => router.replace('/patients')}
                className="ml-auto flex items-center gap-1 font-semibold text-sea-700 transition-colors hover:text-sea-800"
              >
                {Icon.close({ size: 12 })} Clear filters
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.18 }}
          className="table-wrap"
        >
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
              {patients.map((pt, i) => (
                <motion.tr
                  key={pt._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springs.soft, delay: 0.2 + i * 0.045 }}
                  className="group transition-colors duration-150 hover:bg-mist-50/80"
                >
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className={`avatar ${avatarTint(pt._id + pt.name)}`}>{initials(pt.name)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-mist-900">{pt.name}</p>
                        <p className="truncate font-mono text-xs text-mist-500 tnum">{pt.phone || pt.email || 'no contact'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td hidden sm:table-cell">
                    <span className="font-mono tnum">{pt.age}</span> <span className="text-mist-400">/ {GENDER_LABELS[pt.gender]}</span>
                  </td>
                  <td className="td">
                    <span className={`badge ${CONDITION_STYLES[pt.condition]}`}>{pt.condition}</span>
                  </td>
                  <td className="td">
                    {pt.doctor ? (
                      <Link href={`/doctors/${pt.doctor._id}`} className="font-medium text-mist-800 transition hover:text-sea-700">
                        {pt.doctor.name}
                      </Link>
                    ) : (
                      <span className="text-mist-400">unassigned</span>
                    )}
                    <p className="hidden text-xs text-mist-400 xl:block">{pt.doctor?.specialization}</p>
                  </td>
                  <td className="td hidden md:table-cell">
                    <span className={`badge ${STATUS_STYLES[pt.status]}`}>{pt.status}</span>
                  </td>
                  <td className="td hidden lg:table-cell font-mono text-[13px] text-mist-500 tnum">{formatDate(pt.createdAt)}</td>
                  <td className="td text-right">
                    <div className="inline-flex items-center gap-0.5 opacity-60 transition duration-150 group-hover:opacity-100">
                      <motion.button
                        title="Edit patient"
                        whileHover={{ scale: 1.12, rotate: -4 }}
                        whileTap={{ scale: 0.9 }}
                        transition={springs.bouncy}
                        onClick={() => { setEditing(pt); setShowModal(true); }}
                        className="icon-btn"
                      >
                        {Icon.pen({ size: 15 })}
                      </motion.button>
                      <motion.button
                        title="Delete patient"
                        whileHover={{ scale: 1.12, rotate: 4 }}
                        whileTap={{ scale: 0.9 }}
                        transition={springs.bouncy}
                        onClick={() => setDeleting(pt)}
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
        open={showModal}
        patient={editing}
        doctors={patientMeta?.doctors?.map((d) => ({ _id: d.id, name: d.name, specialization: d.specialization })) || []}
        onClose={() => setShowModal(false)}
        onSaved={() => {
          setShowModal(false);
          refetch();
        }}
      />

      <AnimatePresence>
        {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-mist-900/50 backdrop-blur-sm"
            onClick={() => setDeleting(null)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={springs.soft}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-mist-200 bg-white p-6 shadow-overlay">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">{Icon.trash({ size: 18 })}</span>
              <h2 className="text-base font-semibold text-mist-900">Delete patient</h2>
            </div>
            <p className="text-sm leading-relaxed text-mist-600">
              <span className="font-semibold text-mist-900">{deleting.name}</span> will be permanently deleted.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={springs.snappy}
                className="btn-secondary"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={springs.bouncy}
                className="btn-danger"
                onClick={confirmDelete}
              >
                Delete patient
              </motion.button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
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
