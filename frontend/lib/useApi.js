'use client';

/**
 * Data-fetching hook with two levels of cache (an SWR-shaped subset):
 *
 *   const { data, meta, loading, error, refetch } = useApi('/api/doctors', params)
 *   const { data } = useApi('/api/analytics/dashboard', params, { persist: true })
 *
 * 1. In-memory map — fresh for CACHE_TTL_MS, so moving between pages renders
 *    instantly instead of re-requesting JSON the app already has.
 * 2. localStorage snapshot (opt-in via `persist`) — a reload paints the last
 *    payload synchronously, then revalidates in the background.
 *
 * Serialized params are the cache key; an in-flight request is aborted when
 * they change, so a slow response can never overwrite a newer one.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { api } from './api';
import { readSnapshot, writeSnapshot } from './snapshot';

const CACHE_TTL_MS = 15000;
const cache = new Map(); // "path|params" -> { data, meta, at }

function keyOf(path, params) {
  return `${path}|${JSON.stringify(params)}`;
}

/** Drops cached reads after a mutation (all of them: cheap and always correct). */
export function invalidateApi() {
  cache.clear();
}

export function useApi(path, params = {}, options = {}) {
  const persist = Boolean(options.persist);
  const key = useMemo(() => keyOf(path, params), [path, params]);

  // Seed once per key: memory first, then disk.
  const seedRef = useRef({ key: null, entry: null });
  if (seedRef.current.key !== key) {
    seedRef.current = { key, entry: cache.get(key) || (persist ? readSnapshot(key) : null) };
  }
  const seed = seedRef.current.entry;

  const [data, setData] = useState(seed ? seed.data : null);
  const [meta, setMeta] = useState(seed ? seed.meta : null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!seed);
  const abortRef = useRef(null);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const fetchData = useCallback(
    async (signal, quiet = false) => {
      if (!quiet) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await api.get(path, params);
        if (signal && signal.aborted) return;
        const entry = { data: res.data, meta: res.meta || null, at: Date.now() };
        cache.set(key, entry);
        if (persistRef.current) writeSnapshot(key, entry);
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

    const hit = cache.get(key) || (persistRef.current ? readSnapshot(key) : null);
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
