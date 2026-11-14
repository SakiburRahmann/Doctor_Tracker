'use client';

/**
 * Create/Edit doctor form (used in a modal).
 * Client-side mirror of the server validation rules; the backend remains
 * the source of truth — field errors from the API are surfaced per field.
 */
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api, ApiError } from '@/lib/api';

const EMPTY = {
  name: '',
  specialization: '',
  hospital: '',
  phone: '',
  email: '',
  consultationFee: '',
  status: 'active',
};

export default function DoctorFormModal({ open, doctor, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setApiError('');
      setForm(
        doctor
          ? {
              name: doctor.name || '',
              specialization: doctor.specialization || '',
              hospital: doctor.hospital || '',
              phone: doctor.phone || '',
              email: doctor.email || '',
              consultationFee: doctor.consultationFee ?? '',
              status: doctor.status || 'active',
            }
          : EMPTY
      );
    }
  }, [open, doctor]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
  };

  const validate = () => {
    const fe = {};
    if (!form.name.trim()) fe.name = 'Name is required';
    if (!form.specialization.trim()) fe.specialization = 'Specialization is required';
    if (!form.hospital.trim()) fe.hospital = 'Hospital is required';
    if (!/^\+?[0-9][0-9\s-]{6,19}$/.test(form.phone.trim())) fe.phone = 'Invalid phone number';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) fe.email = 'Invalid email address';
    if (form.consultationFee !== '' && Number(form.consultationFee) < 0) fe.consultationFee = 'Fee must be ≥ 0';
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
        specialization: form.specialization.trim(),
        hospital: form.hospital.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        consultationFee: form.consultationFee === '' ? 0 : Number(form.consultationFee),
        status: form.status,
      };
      if (doctor) {
        await api.put(`/api/doctors/${doctor._id}`, body);
      } else {
        await api.post('/api/doctors', body);
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
      title={doctor ? 'Edit doctor' : 'Add new doctor'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="doctor-form" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : doctor ? 'Save changes' : 'Create doctor'}
          </button>
        </>
      }
    >
      <form id="doctor-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {apiError && (
          <div className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {apiError}
          </div>
        )}
        <div>
          <label className="label" htmlFor="df-name">Full name *</label>
          <input id="df-name" className="input" value={form.name} onChange={set('name')} placeholder="Dr. Ayesha Rahman" autoFocus />
          {err('name')}
        </div>
        <div>
          <label className="label" htmlFor="df-spec">Specialization *</label>
          <input id="df-spec" className="input" value={form.specialization} onChange={set('specialization')} placeholder="Cardiology" list="df-spec-list" />
          <datalist id="df-spec-list">
            {['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'General Medicine', 'Gynecology', 'Oncology'].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {err('specialization')}
        </div>
        <div>
          <label className="label" htmlFor="df-hosp">Hospital *</label>
          <input id="df-hosp" className="input" value={form.hospital} onChange={set('hospital')} placeholder="Square Hospital, Dhaka" />
          {err('hospital')}
        </div>
        <div>
          <label className="label" htmlFor="df-phone">Phone *</label>
          <input id="df-phone" className="input" value={form.phone} onChange={set('phone')} placeholder="+880 1712 345678" />
          {err('phone')}
        </div>
        <div>
          <label className="label" htmlFor="df-email">Email *</label>
          <input id="df-email" type="email" className="input" value={form.email} onChange={set('email')} placeholder="doctor@hospital.com" />
          {err('email')}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="df-fee">Consultation fee (৳)</label>
            <input id="df-fee" type="number" min="0" className="input" value={form.consultationFee} onChange={set('consultationFee')} placeholder="1000" />
            {err('consultationFee')}
          </div>
          <div>
            <label className="label" htmlFor="df-status">Status</label>
            <select id="df-status" className="input" value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
