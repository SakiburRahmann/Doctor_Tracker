'use client';

/**
 * Tiny data-fetching hook (a minimal SWR/React-Query pattern):
 *   const { data, meta, loading, error, refetch } = useApi('/api/doctors', params)
 *
 * - Re-fetches when the serialized params change (filter/search/pagination UX)
 * - Cancels in-flight requests on dep change (no stale responses overwriting newer ones)
 * - Returns a stable refetch for refresh-after-mutation flows
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { api } from './api';

export function useApi(path, params = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const key = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(path, params);
        if (signal && signal.aborted) return;
        setData(res.data);
        setMeta(res.meta || null);
      } catch (err) {
        if (signal && signal.aborted) return;
        setError(err);
        setData(null);
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
    fetchData(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    return fetchData(controller.signal);
  }, [fetchData]);

  return { data, meta, loading, error, refetch };
}

export default useApi;
