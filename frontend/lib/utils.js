/**
 * Small shared helpers used across pages/components.
 */

export function formatDate(value) {
  if (!value) return 'no date';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return 'no date';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* Square dot-led badges; muted tints that keep text readable on paper. */
export const CONDITION_STYLES = {
  Critical: 'bg-brick-50 text-brick-700',
  Serious: 'bg-rust-100 text-rust-700',
  Stable: 'bg-spruce-50 text-spruce-700',
  Recovering: 'bg-spruce-100 text-spruce-800',
  Chronic: 'bg-sand-100 text-ink-700',
  'Under Observation': 'bg-sand-200/60 text-ink-700',
};

export const STATUS_STYLES = {
  active: 'bg-spruce-50 text-spruce-700',
  inactive: 'bg-sand-200/60 text-ink-600',
  admitted: 'bg-rust-100 text-rust-700',
  discharged: 'bg-sand-200/60 text-ink-600',
  'follow-up': 'bg-spruce-100 text-spruce-800',
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
