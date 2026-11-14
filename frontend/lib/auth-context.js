'use client';

/**
 * Auth context — the single source of truth for the session.
 *
 * Why Context + SWR-style hooks instead of Redux:
 * see "Technical Decisions" in the README. Short version: the app has exactly one
 * global datum (the session); server data lives in page-level hooks keyed by URL
 * params, so a full store would add ceremony without value.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Phase 1: unknown -> show a loading splash (prevents route flicker on refresh)
  // Phase 2: authenticated / unauthenticated
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }
      try {
        const res = await api.get('/api/auth/me');
        if (!cancelled) {
          setUser(res.data);
          setStatus('authenticated');
        }
      } catch {
        // Expired or invalid token: clear it and require a fresh login.
        setToken(null);
        if (!cancelled) setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    setStatus('authenticated');
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
