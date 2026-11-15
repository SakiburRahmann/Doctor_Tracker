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

/* Status pills: tinted semantic surfaces, readable in both themes. */
export const CONDITION_STYLES = {
  Critical: 'bg-danger-soft text-danger',
  Serious: 'bg-warn-soft text-warn',
  Stable: 'bg-accent-soft text-accent-strong',
  Recovering: 'bg-accent-soft text-accent-strong',
  Chronic: 'bg-surface-3 text-ink-2',
  'Under Observation': 'bg-surface-3 text-ink-2',
};

export const STATUS_STYLES = {
  active: 'bg-accent-soft text-accent-strong',
  inactive: 'bg-surface-3 text-ink-2',
  admitted: 'bg-warn-soft text-warn',
  discharged: 'bg-surface-3 text-ink-2',
  'follow-up': 'bg-accent-soft text-accent-strong',
};

export const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' };

/* Avatar tint rotation — quiet, desaturated, always legible. */
const AVATAR_TINTS = [
  'bg-accent-soft text-accent-strong',
  'bg-surface-3 text-ink-2',
  'bg-warn-soft text-warn',
  'bg-surface-2 text-ink-2',
  'bg-danger-soft text-danger',
  'bg-surface-3 text-ink',
  'bg-accent-soft text-ink',
  'bg-surface-2 text-ink-3',
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
