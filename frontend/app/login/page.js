'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form.
  if (status === 'authenticated' && typeof window !== 'undefined') {
    router.replace('/dashboard');
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fe = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) fe.email = 'Enter a valid email address';
    if (password.length < 6) fe.password = 'Password must be at least 6 characters';
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;

    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Unexpected error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel (hidden on small screens) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-700 p-12 lg:flex">
        <div className="text-2xl font-bold text-white">
          Doctor<span className="text-brand-200">Tracker</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Manage doctors &amp; patients from one clean dashboard.
          </h1>
          <p className="mt-4 text-brand-100">
            Search, filter and paginate records, track patient conditions, and read the
            numbers at a glance with live analytics.
          </p>
        </div>
        <p className="text-xs text-brand-200">Secure admin portal · REST API · MongoDB</p>
        {/* decorative circles */}
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/60" />
        <div aria-hidden className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-800/60" />
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-slate-100 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">✚</span>
            <span className="text-lg font-bold text-slate-900">DoctorTracker</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 mb-6 text-sm text-slate-500">Sign in to the admin portal to continue.</p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((fe) => ({ ...fe, email: undefined }));
                }}
                placeholder="admin@doctortracker.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-11"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((fe) => ({ ...fe, password: undefined }));
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-rose-600">{fieldErrors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
            <p className="mb-1 font-semibold text-slate-600">Demo credentials</p>
            <p>Email: <code className="rounded bg-slate-100 px-1 py-0.5">admin@doctortracker.com</code></p>
            <p>Password: <code className="rounded bg-slate-100 px-1 py-0.5">Admin@123</code></p>
            <p className="mt-1">(Set via <code>SEED_ADMIN_*</code> env vars when you run the seed script.)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
