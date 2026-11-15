/**
 * Thin REST client for the Express API.
 * - Same-origin `/api/*`: next.config rewrites it to the Express deployment, so
 *   there is no CORS preflight and no second TLS handshake per page load.
 * - Injects the Bearer token from localStorage on every request
 * - Normalises errors to a single ApiError shape ({ status, message, fieldErrors })
 * - Single fetch wrapper so retry/auth-expiry logic lives in exactly one place
 */

const API_URL = '';
const TOKEN_KEY = 'dt_token';

export class ApiError extends Error {
  constructor(status, message, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || [];
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, params } = {}) {
  let url = `${API_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
    });
  } catch (err) {
    if (err && err.name === 'TimeoutError') {
      throw new ApiError(0, 'Request timed out. Please try again.');
    }
    throw new ApiError(0, 'Cannot reach the API. Is the backend running?');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }

  // An expired or revoked token ends the session from anywhere in the app, so
  // the auth context does not need a startup round trip to discover it.
  if (res.status === 401 && typeof window !== 'undefined') {
    setToken(null);
    window.dispatchEvent(new Event('dt:unauthorized'));
  }

  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(
      res.status,
      (json && json.message) || `Request failed (${res.status})`,
      json && json.fieldErrors
    );
  }
  return json;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export default api;
