/**
 * In-process TTL cache for read-only API payloads.
 *
 * Every cached read saves a whole MongoDB round trip. On a serverless host a
 * warm instance serves several requests per page load, which is exactly the
 * window where the dashboard asks for the same aggregates more than once.
 * Values are treated as immutable (they are only serialised to JSON).
 */
const stores = new Map();
const MAX_ENTRIES = 200;

function get(key) {
  const hit = stores.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    stores.delete(key);
    return undefined;
  }
  return hit.value;
}

function set(key, value, ttlMs) {
  if (stores.size >= MAX_ENTRIES) stores.clear();
  stores.set(key, { value, expires: Date.now() + ttlMs });
}

/** Returns the cached value or computes, stores and returns a fresh one. */
async function cached(key, ttlMs, producer) {
  const hit = get(key);
  if (hit !== undefined) return hit;
  const value = await producer();
  set(key, value, ttlMs);
  return value;
}

/** Drop everything after a write so the next read is authoritative. */
function clear() {
  stores.clear();
}

module.exports = { cached, clear, get, set };
