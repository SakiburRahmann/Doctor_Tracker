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

/* Tinted pill badges: soft background + readable text, Geist-style semantics. */
export const CONDITION_STYLES = {
  Critical: 'bg-rose-50 text-rose-700',
  Serious: 'bg-amber-50 text-amber-700',
  Stable: 'bg-sea-50 text-sea-700',
  Recovering: 'bg-sea-100 text-sea-800',
  Chronic: 'bg-mist-150 text-mist-700',
  'Under Observation': 'bg-mist-100 text-mist-600',
};

export const STATUS_STYLES = {
  active: 'bg-sea-50 text-sea-700',
  inactive: 'bg-mist-150 text-mist-600',
  admitted: 'bg-amber-50 text-amber-700',
  discharged: 'bg-mist-100 text-mist-600',
  'follow-up': 'bg-sea-100 text-sea-800',
};

export const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' };

/* Avatar tint rotation (soft fills + dark text, 8 variants). */
const AVATAR_TINTS = [
  'bg-sea-100 text-sea-800',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sea-50 text-sea-700',
  'bg-mist-150 text-mist-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-mist-200 text-mist-800',
];

/** Initials for an avatar, e.g. "Dr. Ayesha Rahman" -> "AR". */
export function initials(name = '') {
  const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic tint index from an id/name so a row always gets the same color. */
export function avatarTint(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

/** Debounce helper for search inputs (avoids a request per keystroke). */
export function debounce(fn, ms = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
