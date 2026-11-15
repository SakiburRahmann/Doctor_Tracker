/**
 * Last-known-good response snapshots, kept in localStorage.
 *
 * A repeat visit paints the previous payload immediately (tens of milliseconds)
 * while the network request revalidates it in the background. The snapshot is
 * only a rendering hint: every entry carries the time it was written, and
 * anything older than SNAPSHOT_TTL_MS is ignored.
 */
const PREFIX = 'dt_snap:';
export const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null; // private mode / blocked storage
  }
}

export function readSnapshot(key) {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw);
    if (!at || Date.now() - at > SNAPSHOT_TTL_MS) {
      store.removeItem(PREFIX + key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

const MAX_SNAPSHOTS = 6;

/** Keeps the newest MAX_SNAPSHOTS entries so filter churn cannot fill storage. */
function evictOldest(store) {
  const entries = Object.keys(store)
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => {
      try {
        return { k, at: JSON.parse(store.getItem(k) || '{}').at || 0 };
      } catch {
        return { k, at: 0 };
      }
    })
    .sort((a, b) => a.at - b.at);

  const excess = entries.length - MAX_SNAPSHOTS;
  for (let i = 0; i < excess; i += 1) store.removeItem(entries[i].k);
}

export function writeSnapshot(key, value) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value }));
    evictOldest(store);
  } catch {
    // Quota exceeded: drop every snapshot rather than fail the request path.
    try {
      Object.keys(store)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => store.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

export function clearSnapshots() {
  const store = storage();
  if (!store) return;
  try {
    Object.keys(store)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => store.removeItem(k));
  } catch {
    /* ignore */
  }
}
