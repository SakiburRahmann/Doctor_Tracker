'use client';

/**
 * Tiny data-fetching hook with a shared in-memory cache (an SWR-shaped subset):
 *   const { data, meta, loading, error, refetch } = useApi('/api/dashboard', { months: 12 })
 *
 * - A response stays fresh for CACHE_TTL_MS, so going back to a page renders
 *   instantly from memory instead of re-requesting the same JSON.
 * - Stale entries render immediately and are revalidated in the background.
 * - Serialized params are the cache key; in-flight requests are aborted when
 *   they change, so a slow response can never overwrite a newer one.
 * - Writes call invalidateApi() to drop everything that could have changed.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { api } from './api';

const CACHE_TTL_MS = 15000;
const cache = new Map(); // "path|params" -> { data, meta, at }

function keyOf(path, params) {
  return `${path}|${JSON.stringify(params)}`;
}

/** Drops cached reads after a mutation (all of them: cheap and always correct). */
export function invalidateApi() {
  cache.clear();
}

export function useApi(path, params = {}) {
  const key = useMemo(() => keyOf(path, params), [path, params]);

  const [data, setData] = useState(() => cache.get(key)?.data ?? null);
  const [meta, setMeta] = useState(() => cache.get(key)?.meta ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(() => !cache.has(key));
  const abortRef = useRef(null);

  const fetchData = useCallback(
    async (signal, quiet = false) => {
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await api.get(path, params);
        if (signal && signal.aborted) return;
        cache.set(key, { data: res.data, meta: res.meta || null, at: Date.now() });
        setData(res.data);
        setMeta(res.meta || null);
      } catch (err) {
        if (signal && signal.aborted) return;
        setError(err);
      } finally {
        if (!signal || !signal.aborted) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, key]
  );

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const hit = cache.get(key);
    if (hit) {
      setData(hit.data);
      setMeta(hit.meta);
      setError(null);
    }

    const fresh = hit && Date.now() - hit.at < CACHE_TTL_MS;
    if (fresh) {
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(!hit);
    fetchData(controller.signal, Boolean(hit));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    cache.delete(key);
    return fetchData(controller.signal);
  }, [fetchData, key]);

  return { data, meta, loading, error, refetch };
}

export default useApi;
