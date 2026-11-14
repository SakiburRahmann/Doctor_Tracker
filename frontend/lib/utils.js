/**
 * Small shared helpers used across pages/components.
 */

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CONDITION_STYLES = {
  Critical: 'bg-rose-100 text-rose-700',
  Serious: 'bg-orange-100 text-orange-700',
  Stable: 'bg-emerald-100 text-emerald-700',
  Recovering: 'bg-teal-100 text-teal-700',
  Chronic: 'bg-violet-100 text-violet-700',
  'Under Observation': 'bg-sky-100 text-sky-700',
};

export const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-600',
  admitted: 'bg-amber-100 text-amber-700',
  discharged: 'bg-slate-200 text-slate-600',
  'follow-up': 'bg-indigo-100 text-indigo-700',
};

export const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' };

/** Debounce helper for search inputs (avoids a request per keystroke). */
export function debounce(fn, ms = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
