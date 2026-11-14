'use client';

/**
 * Create/Edit patient form (used in a modal).
 * `doctors` is the active-doctor list fetched once by the parent page and reused
 * here for the doctor selector (avoids a duplicate request per modal open).
 */
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api, ApiError } from '@/lib/api';
import { GENDER_LABELS } from '@/lib/utils';

const CONDITIONS = ['Critical', 'Serious', 'Stable', 'Recovering', 'Chronic', 'Under Observation'];
const STATUSES = ['admitted', 'discharged', 'follow-up'];

const EMPTY = {
  name: '',
  age: '',
  gender: 'male',
  condition: 'Stable',
  doctor: '',
  phone: '',
  email: '',
  status: 'admitted',
  notes: '',
};

export default function PatientFormModal({ open, patient, doctors = [], defaultDoctorId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setApiError('');
      setForm(
        patient
          ? {
              name: patient.name || '',
              age: patient.age ?? '',
              gender: patient.gender || 'male',
              condition: patient.condition || 'Stable',
              doctor: patient.doctor?._id || patient.doctor || '',
              phone: patient.phone || '',
              email: patient.email || '',
              status: patient.status || 'admitted',
              notes: patient.notes || '',
            }
          : { ...EMPTY, doctor: defaultDoctorId || (doctors[0]?._id ?? '') }
      );
    }
  }, [open, patient, defaultDoctorId, doctors]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
  };

  const validate = () => {
    const fe = {};
    if (!form.name.trim()) fe.name = 'Name is required';
    if (form.age === '' || Number(form.age) < 0 || Number(form.age) > 130) fe.age = 'Age must be 0–130';
    if (!form.doctor) fe.doctor = 'Select a doctor';
    if (form.phone.trim() && !/^\+?[0-9][0-9\s-]{6,19}$/.test(form.phone.trim())) fe.phone = 'Invalid phone number';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) fe.email = 'Invalid email address';
    if (form.notes.length > 500) fe.notes = 'Notes must be under 500 characters';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      const body = {
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        condition: form.condition,
        doctor: form.doctor,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
      };
      if (patient) {
        await api.put(`/api/patients/${patient._id}`, body);
      } else {
        await api.post('/api/patients', body);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors?.length) {
          const fe = {};
          err.fieldErrors.forEach((x) => {
            fe[x.field] = x.message;
          });
          setFieldErrors(fe);
        }
        setApiError(err.message);
      } else {
        setApiError('Unexpected error. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const err = (k) =>
    fieldErrors[k] ? <p className="mt-1 text-xs text-rose-600">{fieldErrors[k]}</p> : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={patient ? 'Edit patient' : 'Add new patient'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="patient-form" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : patient ? 'Save changes' : 'Add patient'}
          </button>
        </>
      }
    >
      <form id="patient-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {apiError && (
          <div className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {apiError}
          </div>
        )}
        <div>
          <label className="label" htmlFor="pf-name">Full name *</label>
          <input id="pf-name" className="input" value={form.name} onChange={set('name')} placeholder="Rahim Uddin" autoFocus />
          {err('name')}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pf-age">Age *</label>
            <input id="pf-age" type="number" min="0" max="130" className="input" value={form.age} onChange={set('age')} placeholder="42" />
            {err('age')}
          </div>
          <div>
            <label className="label" htmlFor="pf-gender">Gender *</label>
            <select id="pf-gender" className="input" value={form.gender} onChange={set('gender')}>
              {Object.entries(GENDER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pf-condition">Condition *</label>
          <select id="pf-condition" className="input" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pf-doctor">Assigned doctor *</label>
          <select id="pf-doctor" className="input" value={form.doctor} onChange={set('doctor')}>
            <option value="">Select a doctor…</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} — {d.specialization}
              </option>
            ))}
          </select>
          {err('doctor')}
        </div>
        <div>
          <label className="label" htmlFor="pf-phone">Phone</label>
          <input id="pf-phone" className="input" value={form.phone} onChange={set('phone')} placeholder="+880 1811 223344" />
          {err('phone')}
        </div>
        <div>
          <label className="label" htmlFor="pf-email">Email</label>
          <input id="pf-email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="patient@email.com" />
          {err('email')}
        </div>
        <div>
          <label className="label" htmlFor="pf-status">Status</label>
          <select id="pf-status" className="input" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pf-notes">Notes</label>
          <textarea id="pf-notes" rows={3} maxLength={500} className="input resize-none" value={form.notes} onChange={set('notes')} placeholder="Optional clinical notes (max 500 chars)" />
          {err('notes')}
        </div>
      </form>
    </Modal>
  );
}
