'use client';

/**
 * Auth context — the single source of truth for the session.
 *
 * The session is resolved from the JWT in localStorage, synchronously: the
 * token is signed, carries the admin's claims and expires on its own, so
 * reading it costs nothing. Previously the app called `/api/auth/me` before
 * rendering anything, which put a full round trip (and a CORS preflight) in
 * front of every page load and, worse, delayed every data request behind it.
 *
 * A 401 from any endpoint clears the token and ends the session from here, so
 * expiry is still handled without a startup check.
 *
 * Why Context instead of Redux: the app has exactly one global datum (the
 * session); server data lives in page-level hooks keyed by URL params, so a
 * full store would add ceremony without value.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api';
import { clearSnapshots } from './snapshot';

const AuthContext = createContext(null);

/** Decodes the JWT payload without verifying it (the API verifies every request). */
function claimsFromToken(token) {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(decodeURIComponent(escape(atob(normalized))));
    if (json.exp && json.exp * 1000 <= Date.now()) return null;
    return json;
  } catch {
    return null;
  }
}

function userFromClaims(claims) {
  return {
    id: claims.sub,
    name: claims.name || 'Administrator',
    email: claims.email || '',
    role: claims.role || 'admin',
  };
}

export function AuthProvider({ children }) {
  // Resolved in the initial render: no loading phase, no spinner flash.
  const [status, setStatus] = useState(() => {
    const claims = claimsFromToken(getToken());
    return claims ? 'authenticated' : getToken() ? 'loading' : 'unauthenticated';
  });
  const [user, setUser] = useState(() => {
    const claims = claimsFromToken(getToken());
    return claims ? userFromClaims(claims) : null;
  });

  // Token present but unreadable (older token without claims): ask once, in the
  // background, and only for the profile — never as a gate on rendering.
  useEffect(() => {
    if (status !== 'loading') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        if (cancelled) return;
        setUser(res.data);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setToken(null);
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Any 401 anywhere in the app ends the session.
  useEffect(() => {
    const onUnauthorized = () => {
      clearSnapshots();
      setUser(null);
      setStatus('unauthenticated');
    };
    window.addEventListener('dt:unauthorized', onUnauthorized);
    return () => window.removeEventListener('dt:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    setToken(res.data.token);
    const claims = claimsFromToken(res.data.token);
    setUser(claims ? { ...userFromClaims(claims), ...res.data.user } : res.data.user);
    setStatus('authenticated');
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    clearSnapshots();
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
